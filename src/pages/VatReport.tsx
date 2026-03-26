import { useState, useMemo, useCallback } from 'react';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useVatLedger, type VatLedgerEntry } from '@/hooks/useVatLedger';
import { formatCurrency } from '@/types/invoice';
import type { Currency } from '@/types/invoice';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Receipt, Search } from 'lucide-react';
import { exportToCsv } from '@/lib/exportCsv';
import { useEffect } from 'react';

export default function VatReport() {
  const { activeCompany, activeCompanyId } = useActiveCompany();
  const { fetchEntries } = useVatLedger();
  const [entries, setEntries] = useState<VatLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState<Currency>('ZAR');

  // Filters
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const [dateFrom, setDateFrom] = useState(firstOfMonth.toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(now.toISOString().split('T')[0]);
  const [filterRate, setFilterRate] = useState('all');

  const loadEntries = useCallback(async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    const data = await fetchEntries(activeCompanyId, dateFrom, dateTo);
    setEntries(data);
    setLoading(false);
  }, [activeCompanyId, dateFrom, dateTo, fetchEntries]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  // Get unique tax rate names
  const rateNames = useMemo(() => {
    const names = new Set(entries.map(e => e.taxRateName));
    return Array.from(names).sort();
  }, [entries]);

  // Filtered entries
  const filtered = useMemo(() => {
    if (filterRate === 'all') return entries;
    return entries.filter(e => e.taxRateName === filterRate);
  }, [entries, filterRate]);

  // Breakdown by tax rate
  const breakdown = useMemo(() => {
    const groups: Record<string, { taxable: number; vat: number; count: number; rate: number }> = {};
    filtered.forEach(e => {
      const key = e.taxRateName;
      if (!groups[key]) groups[key] = { taxable: 0, vat: 0, count: 0, rate: e.taxRate };
      groups[key].taxable += e.taxableAmount;
      groups[key].vat += e.vatAmount;
      groups[key].count++;
    });
    return groups;
  }, [filtered]);

  const totalTaxable = filtered.reduce((s, e) => s + e.taxableAmount, 0);
  const totalVat = filtered.reduce((s, e) => s + e.vatAmount, 0);
  const invoiceCount = new Set(filtered.map(e => e.invoiceId)).size;

  const handleExportCsv = () => {
    exportToCsv('vat-report.csv',
      ['Invoice #', 'Date', 'Customer', 'Tax Rate', 'Rate %', 'Taxable Amount', 'VAT Amount', 'Status'],
      filtered.map(e => [
        e.invoiceNumber, e.invoiceDate, e.customerName,
        e.taxRateName, e.taxRate, e.taxableAmount.toFixed(2),
        e.vatAmount.toFixed(2), e.status
      ])
    );
  };

  const handleExportPdf = async () => {
    const element = document.getElementById('vat-report-content');
    if (!element) return;
    const html2pdf = (await import('html2pdf.js')).default;
    html2pdf().set({
      margin: 0.5,
      filename: `vat-report-${dateFrom}-${dateTo}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
    }).from(element).save();
  };

  const isVatRegistered = activeCompany?.isVatRegistered ?? false;

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">VAT Report</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Output VAT summary for {activeCompany?.name || 'your company'}
          </p>
        </div>
        {isVatRegistered && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCsv}>
              <Download className="mr-1.5 h-4 w-4" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPdf}>
              <Download className="mr-1.5 h-4 w-4" /> PDF
            </Button>
          </div>
        )}
      </div>

      {!isVatRegistered ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-20">
          <Receipt className="h-10 w-10 text-muted-foreground/30" />
          <h3 className="mt-4 text-lg font-medium">VAT not enabled</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm text-center">
            This company is not registered for VAT. Enable VAT in company settings to start tracking tax.
          </p>
        </div>
      ) : (
      <>

      {/* Filters */}
      <div className="rounded-lg border bg-card p-4 mb-6 invoice-shadow">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-1.5">
            <Label className="text-xs">From</Label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9 w-40" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">To</Label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9 w-40" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Tax Rate</Label>
            <Select value={filterRate} onValueChange={setFilterRate}>
              <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tax Rates</SelectItem>
                {rateNames.map(name => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={loadEntries} className="h-9">
            <Search className="mr-1.5 h-4 w-4" /> Apply
          </Button>
        </div>
      </div>

      <div id="vat-report-content">
        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <div className="rounded-xl border border-border/50 bg-card p-5 invoice-shadow">
            <p className="text-xs text-muted-foreground mb-1">Total Taxable Sales</p>
            <p className="text-2xl font-semibold mono">{formatCurrency(totalTaxable, currency)}</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card p-5 invoice-shadow">
            <p className="text-xs text-muted-foreground mb-1">Total VAT Collected</p>
            <p className="text-2xl font-semibold mono text-primary">{formatCurrency(totalVat, currency)}</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card p-5 invoice-shadow">
            <p className="text-xs text-muted-foreground mb-1">Grand Total</p>
            <p className="text-2xl font-semibold mono">{formatCurrency(totalTaxable + totalVat, currency)}</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card p-5 invoice-shadow">
            <p className="text-xs text-muted-foreground mb-1">Invoice Count</p>
            <p className="text-2xl font-semibold">{invoiceCount}</p>
          </div>
        </div>

        {/* Breakdown by Tax Rate */}
        <div className="rounded-lg border bg-card p-6 mb-6 invoice-shadow">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
            <Receipt className="h-4 w-4" /> Breakdown by Tax Rate
          </h2>
          {Object.keys(breakdown).length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No VAT entries for this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Tax Rate</th>
                    <th className="py-2.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Rate %</th>
                    <th className="py-2.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Entries</th>
                    <th className="py-2.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Taxable Amount</th>
                    <th className="py-2.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">VAT Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(breakdown).map(([name, data]) => (
                    <tr key={name} className="border-b last:border-0">
                      <td className="py-3 font-medium">{name}</td>
                      <td className="py-3 text-right mono">{data.rate}%</td>
                      <td className="py-3 text-right">{data.count}</td>
                      <td className="py-3 text-right mono">{formatCurrency(data.taxable, currency)}</td>
                      <td className="py-3 text-right mono font-medium">{formatCurrency(data.vat, currency)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 font-semibold">
                    <td className="py-3" colSpan={3}>Total</td>
                    <td className="py-3 text-right mono">{formatCurrency(totalTaxable, currency)}</td>
                    <td className="py-3 text-right mono text-primary">{formatCurrency(totalVat, currency)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detailed Entries */}
        {filtered.length > 0 && (
          <div className="rounded-lg border bg-card p-6 invoice-shadow">
            <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4">Detailed Entries</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Invoice</th>
                    <th className="py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Date</th>
                    <th className="py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Customer</th>
                    <th className="py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Tax Rate</th>
                    <th className="py-2.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Taxable</th>
                    <th className="py-2.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">VAT</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(e => (
                    <tr key={e.id} className="border-b last:border-0">
                      <td className="py-2.5 mono text-xs">{e.invoiceNumber}</td>
                      <td className="py-2.5 text-muted-foreground">{e.invoiceDate}</td>
                      <td className="py-2.5">{e.customerName}</td>
                      <td className="py-2.5 text-muted-foreground">{e.taxRateName} ({e.taxRate}%)</td>
                      <td className="py-2.5 text-right mono">{formatCurrency(e.taxableAmount, currency)}</td>
                      <td className="py-2.5 text-right mono font-medium">{formatCurrency(e.vatAmount, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      </>
      )}
    </AppLayout>
  );
}
