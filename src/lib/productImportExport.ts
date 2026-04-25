import * as XLSX from 'xlsx';
import type { Product } from '@/hooks/useProducts';

export type ParsedProductRow = {
  code: string;
  name: string;
  type: 'service' | 'product';
  isTracked: boolean;
  purchaseEnabled: boolean;
  purchasePrice: number;
  purchaseDescription: string;
  purchaseTaxRate?: number;
  sellEnabled: boolean;
  sellPrice: number;
  sellDescription: string;
  sellTaxRate?: number;
  status: 'active' | 'archived';
  __error?: string;
};

const HEADER_ALIASES: Record<string, string> = {
  code: 'code', sku: 'code', 'item code': 'code', 'product code': 'code',
  name: 'name', 'item name': 'name', 'product name': 'name', description: 'name',
  type: 'type',
  tracked: 'isTracked', 'is tracked': 'isTracked', 'track inventory': 'isTracked',
  'purchase enabled': 'purchaseEnabled', 'buy enabled': 'purchaseEnabled',
  'purchase price': 'purchasePrice', 'cost': 'purchasePrice', 'cost price': 'purchasePrice', 'buy price': 'purchasePrice',
  'purchase description': 'purchaseDescription', 'cost description': 'purchaseDescription',
  'purchase tax rate': 'purchaseTaxRate', 'purchase tax': 'purchaseTaxRate', 'cost tax': 'purchaseTaxRate',
  'sell enabled': 'sellEnabled', 'sale enabled': 'sellEnabled',
  'sell price': 'sellPrice', 'sale price': 'sellPrice', 'price': 'sellPrice', 'unit price': 'sellPrice',
  'sell description': 'sellDescription', 'sale description': 'sellDescription',
  'sell tax rate': 'sellTaxRate', 'sell tax': 'sellTaxRate', 'sale tax': 'sellTaxRate', 'tax': 'sellTaxRate', 'tax rate': 'sellTaxRate', 'vat': 'sellTaxRate',
  status: 'status',
};

function normHeader(h: string): string {
  return HEADER_ALIASES[h.trim().toLowerCase()] || h.trim();
}

function toBool(v: any, fallback = true): boolean {
  if (v === undefined || v === null || v === '') return fallback;
  const s = String(v).trim().toLowerCase();
  return ['true', 'yes', 'y', '1', 'enabled', 'on'].includes(s);
}

function toNum(v: any): number {
  if (v === undefined || v === null || v === '') return 0;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? 0 : n;
}

function rowToProduct(raw: Record<string, any>, defaultTaxRate: number): ParsedProductRow {
  const obj: Record<string, any> = {};
  for (const [k, v] of Object.entries(raw)) {
    obj[normHeader(k)] = v;
  }
  const code = String(obj.code ?? '').trim();
  const name = String(obj.name ?? '').trim();
  const isTracked = toBool(obj.isTracked, false);
  const typeRaw = String(obj.type ?? '').trim().toLowerCase();
  const type: 'service' | 'product' = typeRaw === 'product' || isTracked ? 'product' : 'service';
  const purchaseEnabled = toBool(obj.purchaseEnabled, obj.purchasePrice !== undefined && obj.purchasePrice !== '');
  const sellEnabled = toBool(obj.sellEnabled, true);
  const statusRaw = String(obj.status ?? 'active').trim().toLowerCase();
  const status: 'active' | 'archived' = statusRaw === 'archived' ? 'archived' : 'active';

  const row: ParsedProductRow = {
    code,
    name,
    type,
    isTracked,
    purchaseEnabled,
    purchasePrice: toNum(obj.purchasePrice),
    purchaseDescription: String(obj.purchaseDescription ?? '').trim(),
    purchaseTaxRate: obj.purchaseTaxRate !== undefined && obj.purchaseTaxRate !== '' ? toNum(obj.purchaseTaxRate) : defaultTaxRate,
    sellEnabled,
    sellPrice: toNum(obj.sellPrice),
    sellDescription: String(obj.sellDescription ?? '').trim(),
    sellTaxRate: obj.sellTaxRate !== undefined && obj.sellTaxRate !== '' ? toNum(obj.sellTaxRate) : defaultTaxRate,
    status,
  };
  if (!row.code) row.__error = 'Missing code';
  return row;
}

function parseCsv(text: string): Record<string, any>[] {
  const rows: string[][] = [];
  let cur = '', row: string[] = [], inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else if (c === '\r') { /* skip */ }
      else cur += c;
    }
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  if (rows.length === 0) return [];
  const headers = rows[0].map(h => h.trim());
  return rows.slice(1).filter(r => r.some(c => c && c.trim().length)).map(r => {
    const obj: Record<string, any> = {};
    headers.forEach((h, i) => { obj[h] = r[i] ?? ''; });
    return obj;
  });
}

function parseTxt(text: string): Record<string, any>[] {
  // Try tab-separated first, then fall back to CSV
  const firstLine = text.split(/\r?\n/)[0] || '';
  if (firstLine.includes('\t')) {
    return parseCsv(text.replace(/\t/g, ','));
  }
  return parseCsv(text);
}

async function parsePdf(file: File): Promise<Record<string, any>[]> {
  const pdfjs: any = await import('pdfjs-dist');
  // Disable worker (run in main thread) for simplicity
  pdfjs.GlobalWorkerOptions.workerSrc = '';
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf, disableWorker: true, isEvalSupported: false }).promise;
  const lines: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    // Group text items by line (y-position)
    const byY: Record<string, { x: number; str: string }[]> = {};
    for (const item of content.items as any[]) {
      const y = Math.round(item.transform[5]);
      const x = item.transform[4];
      (byY[y] ||= []).push({ x, str: item.str });
    }
    const sortedY = Object.keys(byY).map(Number).sort((a, b) => b - a);
    for (const y of sortedY) {
      const line = byY[y].sort((a, b) => a.x - b.x).map(s => s.str).join(' ').trim();
      if (line) lines.push(line);
    }
  }
  if (lines.length === 0) return [];
  // Try parsing as CSV-style content
  const text = lines.join('\n');
  const parsed = parseCsv(text);
  if (parsed.length > 0) return parsed;
  // Fallback: each non-empty line becomes a code-only entry
  return lines.slice(1).map(l => ({ code: l.split(/\s+/)[0], name: l }));
}

export async function parseProductFile(file: File, defaultTaxRate: number): Promise<ParsedProductRow[]> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  let raw: Record<string, any>[] = [];
  if (ext === 'csv') {
    raw = parseCsv(await file.text());
  } else if (ext === 'txt') {
    raw = parseTxt(await file.text());
  } else if (ext === 'xlsx' || ext === 'xls') {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    raw = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  } else if (ext === 'pdf') {
    raw = await parsePdf(file);
  } else {
    throw new Error(`Unsupported file type: .${ext}`);
  }
  return raw.map(r => rowToProduct(r, defaultTaxRate));
}

function productsToRows(products: Product[]) {
  return products.map(p => ({
    code: p.code,
    name: p.name,
    type: p.type,
    isTracked: p.isTracked ? 'yes' : 'no',
    purchaseEnabled: p.purchaseEnabled ? 'yes' : 'no',
    purchasePrice: p.purchasePrice,
    purchaseDescription: p.purchaseDescription,
    purchaseTaxRate: p.purchaseTaxRate ?? '',
    sellEnabled: p.sellEnabled ? 'yes' : 'no',
    sellPrice: p.sellPrice,
    sellDescription: p.sellDescription,
    sellTaxRate: p.sellTaxRate ?? '',
    status: p.status,
  }));
}

function download(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportProducts(products: Product[], format: 'csv' | 'xlsx' | 'txt' | 'pdf' | 'json') {
  const rows = productsToRows(products);
  const headers = Object.keys(rows[0] || {
    code: '', name: '', type: '', isTracked: '', purchaseEnabled: '', purchasePrice: '',
    purchaseDescription: '', purchaseTaxRate: '', sellEnabled: '', sellPrice: '',
    sellDescription: '', sellTaxRate: '', status: '',
  });
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === 'json') {
    download(`products-${stamp}.json`, new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' }));
    return;
  }

  if (format === 'csv' || format === 'txt') {
    const escape = (v: any) => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => escape((r as any)[h])).join(','))].join('\n');
    const mime = format === 'csv' ? 'text/csv' : 'text/plain';
    download(`products-${stamp}.${format}`, new Blob([csv], { type: `${mime};charset=utf-8;` }));
    return;
  }

  if (format === 'xlsx') {
    const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    download(`products-${stamp}.xlsx`, new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    return;
  }

  if (format === 'pdf') {
    // Generate a printable HTML and trigger the system print dialog
    const win = window.open('', '_blank');
    if (!win) return;
    const tableRows = rows.map(r => `<tr>${headers.map(h => `<td>${String((r as any)[h] ?? '').replace(/</g, '&lt;')}</td>`).join('')}</tr>`).join('');
    win.document.write(`<!doctype html><html><head><title>Products</title>
      <style>
        body{font-family:system-ui,sans-serif;padding:20px;color:#111}
        h1{font-size:18px;margin:0 0 12px}
        table{border-collapse:collapse;width:100%;font-size:11px}
        th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}
        th{background:#f5f5f5;text-transform:capitalize}
        @media print { @page { size: landscape; margin: 12mm; } }
      </style></head><body>
      <h1>Products & Services — ${stamp}</h1>
      <table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${tableRows}</tbody></table>
      <script>window.onload=()=>window.print()</script>
      </body></html>`);
    win.document.close();
  }
}

export function downloadImportTemplate(format: 'csv' | 'xlsx') {
  const sample = [{
    code: 'SKU-001', name: 'Sample Product', type: 'product', isTracked: 'no',
    purchaseEnabled: 'yes', purchasePrice: 50, purchaseDescription: 'Bought from supplier', purchaseTaxRate: 15,
    sellEnabled: 'yes', sellPrice: 100, sellDescription: 'Sold to customer', sellTaxRate: 15,
    status: 'active',
  }];
  if (format === 'csv') {
    const headers = Object.keys(sample[0]);
    const csv = [headers.join(','), headers.map(h => (sample[0] as any)[h]).join(',')].join('\n');
    download('products-template.csv', new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  } else {
    const ws = XLSX.utils.json_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    download('products-template.xlsx', new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  }
}