import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, CheckCircle2, AlertCircle, Download } from 'lucide-react';
import { parseProductFile, downloadImportTemplate, type ParsedProductRow } from '@/lib/productImportExport';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import type { Product } from '@/hooks/useProducts';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  existingCodes: Set<string>;
  onImport: (product: Omit<Product, 'id' | 'createdAt'>) => Promise<any>;
  onDone: () => void;
}

export default function ImportProductsDialog({ open, onOpenChange, existingCodes, onImport, onDone }: Props) {
  const { activeCompanyId, activeCompany } = useActiveCompany();
  const isVatRegistered = activeCompany?.isVatRegistered ?? false;
  const defaultTaxRate = isVatRegistered ? (activeCompany?.vatRate ?? 15) : 0;
  const [rows, setRows] = useState<ParsedProductRow[]>([]);
  const [filename, setFilename] = useState('');
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const reset = () => { setRows([]); setFilename(''); setProgress({ done: 0, total: 0 }); };

  const handleFile = async (file: File) => {
    setParsing(true);
    try {
      const parsed = await parseProductFile(file, defaultTaxRate);
      if (parsed.length === 0) { toast.error('No rows found in file'); return; }
      // Mark duplicates
      parsed.forEach(r => {
        if (!r.__error && existingCodes.has(r.code)) r.__error = 'Code already exists';
      });
      setRows(parsed);
      setFilename(file.name);
    } catch (e: any) {
      toast.error(e.message || 'Failed to parse file');
    } finally {
      setParsing(false);
    }
  };

  const validRows = rows.filter(r => !r.__error);
  const errorRows = rows.filter(r => r.__error);

  const handleImport = async () => {
    if (validRows.length === 0) return;
    setImporting(true);
    setProgress({ done: 0, total: validRows.length });
    let success = 0, failed = 0;
    for (const r of validRows) {
      try {
        const ok = await onImport({
          companyId: activeCompanyId || '',
          code: r.code,
          name: r.name,
          type: r.type,
          isTracked: r.isTracked,
          purchaseEnabled: r.purchaseEnabled,
          purchasePrice: r.purchasePrice,
          purchaseDescription: r.purchaseDescription,
          purchaseTaxRate: isVatRegistered ? r.purchaseTaxRate : 0,
          sellEnabled: r.sellEnabled,
          sellPrice: r.sellPrice,
          sellDescription: r.sellDescription,
          sellTaxRate: isVatRegistered ? r.sellTaxRate : 0,
          status: r.status,
        });
        if (ok) success++; else failed++;
      } catch {
        failed++;
      }
      setProgress(p => ({ ...p, done: p.done + 1 }));
    }
    setImporting(false);
    if (success > 0) toast.success(`Imported ${success} item${success === 1 ? '' : 's'}${failed ? `, ${failed} failed` : ''}`);
    else toast.error('No items were imported');
    onDone();
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!importing) { onOpenChange(v); if (!v) reset(); } }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Products & Services</DialogTitle>
          <DialogDescription>
            Upload a CSV, Excel (.xlsx), TXT, or PDF file. Required column: <code className="text-xs bg-muted px-1 rounded">code</code>.
          </DialogDescription>
        </DialogHeader>

        {rows.length === 0 ? (
          <div className="space-y-4 mt-2">
            <label
              htmlFor="prod-import-file"
              className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border hover:border-primary/40 transition-colors p-10 cursor-pointer"
            >
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">{parsing ? 'Parsing...' : 'Click to upload a file'}</p>
              <p className="text-xs text-muted-foreground mt-1">CSV, XLSX, TXT, or PDF</p>
              <input
                id="prod-import-file"
                type="file"
                accept=".csv,.xlsx,.xls,.txt,.pdf"
                className="hidden"
                disabled={parsing}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = '';
                }}
              />
            </label>
            <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Need a starting point?</p>
              <p className="mb-2">Download a sample template with all supported columns.</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => downloadImportTemplate('csv')}>
                  <Download className="h-3.5 w-3.5 mr-1.5" /> CSV template
                </Button>
                <Button variant="outline" size="sm" onClick={() => downloadImportTemplate('xlsx')}>
                  <Download className="h-3.5 w-3.5 mr-1.5" /> Excel template
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border bg-muted/20 p-3">
              <div className="flex items-center gap-2 text-sm min-w-0">
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="truncate font-medium">{filename}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" /> {validRows.length} valid</Badge>
                {errorRows.length > 0 && <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" /> {errorRows.length} skipped</Badge>}
              </div>
            </div>

            <div className="rounded-lg border max-h-72 overflow-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/30 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Code</th>
                    <th className="px-3 py-2 text-left font-medium">Name</th>
                    <th className="px-3 py-2 text-left font-medium">Type</th>
                    <th className="px-3 py-2 text-right font-medium">Sale</th>
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 100).map((r, i) => (
                    <tr key={i} className={`border-t ${r.__error ? 'bg-destructive/5' : ''}`}>
                      <td className="px-3 py-1.5 mono">{r.code || <span className="text-destructive">—</span>}</td>
                      <td className="px-3 py-1.5">{r.name || '—'}</td>
                      <td className="px-3 py-1.5 capitalize">{r.type}</td>
                      <td className="px-3 py-1.5 text-right mono">{r.sellPrice.toFixed(2)}</td>
                      <td className="px-3 py-1.5">
                        {r.__error ? <span className="text-destructive">{r.__error}</span> : <span className="text-muted-foreground">Ready</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 100 && (
                <div className="border-t bg-muted/20 px-3 py-2 text-xs text-muted-foreground text-center">
                  Showing first 100 of {rows.length} rows
                </div>
              )}
            </div>

            {importing && (
              <div className="text-sm text-muted-foreground">
                Importing {progress.done} of {progress.total}...
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={reset} disabled={importing}>Choose another file</Button>
              <Button onClick={handleImport} disabled={importing || validRows.length === 0}>
                {importing ? 'Importing...' : `Import ${validRows.length} item${validRows.length === 1 ? '' : 's'}`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}