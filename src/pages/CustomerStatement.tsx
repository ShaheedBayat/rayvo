import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useInvoices } from '@/hooks/useInvoiceStore';
import { useCreditNotes } from '@/hooks/useCreditNotes';
import { useCustomers } from '@/hooks/useCustomers';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, calculateSmartTotals } from '@/types/invoice';
import { useCompanies } from '@/hooks/useInvoiceStore';
import { formatDate } from '@/lib/formatDate';
import type { Currency } from '@/types/invoice';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Download } from 'lucide-react';

export default function CustomerStatement() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { customers } = useCustomers();
  const { invoices } = useInvoices();
  const { getCompany } = useCompanies();
  const { creditNotes } = useCreditNotes();

  const customer = customers.find(c => c.id === id);

  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 6);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);

  // Fetch all payments for this customer's invoices
  const [allPayments, setAllPayments] = useState<any[]>([]);
  const customerInvoiceIds = useMemo(() =>
    invoices.filter(i => i.clientName === customer?.name).map(i => i.id),
    [invoices, customer]
  );

  const fetchPayments = useCallback(async () => {
    if (!user || customerInvoiceIds.length === 0) { setAllPayments([]); return; }
    const { data } = await supabase
      .from('payments')
      .select('*')
      .in('invoice_id', customerInvoiceIds)
      .order('payment_date', { ascending: true });
    if (data) setAllPayments(data);
  }, [user, customerInvoiceIds]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const customerInvoices = useMemo(() =>
    invoices
      .filter(i => i.clientName === customer?.name && i.status !== 'voided')
      .filter(i => {
        const d = new Date(i.createdAt);
        return d >= new Date(dateFrom) && d <= new Date(dateTo + 'T23:59:59');
      })
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [invoices, customer, dateFrom, dateTo]
  );

  const customerCreditNotes = useMemo(() =>
    creditNotes
      .filter(cn => cn.clientName === customer?.name)
      .filter(cn => {
        const d = new Date(cn.createdAt);
        return d >= new Date(dateFrom) && d <= new Date(dateTo + 'T23:59:59');
      })
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [creditNotes, customer, dateFrom, dateTo]
  );

  const filteredPayments = useMemo(() =>
    allPayments.filter(p => {
      const d = new Date(p.payment_date);
      return d >= new Date(dateFrom) && d <= new Date(dateTo + 'T23:59:59');
    }),
    [allPayments, dateFrom, dateTo]
  );

  // Build statement entries
  const entries = useMemo(() => {
    const items: { date: string; ref: string; type: string; amount: number; currency: Currency }[] = [];
    customerInvoices.forEach(inv => {
      items.push({
        date: inv.createdAt,
        ref: inv.invoiceNumber,
        type: inv.status === 'paid' ? 'Invoice (Paid)' : 'Invoice',
        amount: (() => {
          const co = getCompany(inv.companyId);
          return calculateSmartTotals(inv.items, inv.taxRate, co?.pricingMode || 'exclusive', co?.isVatRegistered ?? false).total;
        })(),
        currency: inv.currency,
      });
    });
    customerCreditNotes.forEach(cn => {
      const cnCompany = cn.companyId ? getCompany(cn.companyId) : undefined;
      items.push({
        date: cn.createdAt,
        ref: cn.creditNoteNumber,
        type: 'Credit Note',
        amount: -calculateSmartTotals(cn.items, cn.taxRate, cnCompany?.pricingMode || 'exclusive', cnCompany?.isVatRegistered ?? false).total,
        currency: cn.currency,
      });
    });
    // Add payments as negative entries (reducing balance)
    filteredPayments.forEach(p => {
      const inv = invoices.find(i => i.id === p.invoice_id);
      items.push({
        date: p.payment_date,
        ref: p.reference || `Payment (${inv?.invoiceNumber || 'N/A'})`,
        type: 'Payment',
        amount: -Number(p.amount),
        currency: (inv?.currency as Currency) || 'ZAR',
      });
    });
    return items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [customerInvoices, customerCreditNotes, filteredPayments, invoices]);

  const handleExportPdf = async () => {
    const element = document.getElementById('statement-content');
    if (!element) return;
    const html2pdf = (await import('html2pdf.js')).default;
    html2pdf().set({ margin: 0.5, filename: `Statement-${customer?.name}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' } }).from(element).save();
  };

  if (!customer) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Customer not found.</p>
          <button onClick={() => navigate('/customers')} className="text-primary hover:underline text-sm mt-2">Back to customers</button>
        </div>
      </AppLayout>
    );
  }

  let runningBalance = 0;

  return (
    <AppLayout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/customers')} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Customers
          </button>
          <h1 className="text-lg font-semibold">Statement: {customer.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9 w-36" />
          <span className="text-muted-foreground text-sm">to</span>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9 w-36" />
          <Button size="sm" onClick={handleExportPdf}>
            <Download className="mr-1.5 h-4 w-4" /> PDF
          </Button>
        </div>
      </div>

      <div id="statement-content" className="max-w-[800px] mx-auto bg-card rounded-lg border p-8 invoice-shadow">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-1">Customer Statement</h2>
          <p className="text-sm text-muted-foreground">{customer.name}</p>
          {customer.email && <p className="text-sm text-muted-foreground">{customer.email}</p>}
          <p className="text-xs text-muted-foreground mt-2">Period: {formatDate(dateFrom)} — {formatDate(dateTo)}</p>
        </div>

        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">No transactions in this period.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-border">
                <th className="py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Date</th>
                <th className="py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Reference</th>
                <th className="py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Type</th>
                <th className="py-2 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Amount</th>
                <th className="py-2 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Balance</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => {
                runningBalance += entry.amount;
                return (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2.5">{formatDate(entry.date)}</td>
                    <td className="py-2.5 mono text-xs">{entry.ref}</td>
                    <td className="py-2.5 text-muted-foreground">{entry.type}</td>
                    <td className={`py-2.5 text-right mono font-medium ${entry.amount < 0 ? 'text-success' : ''}`}>
                      {entry.amount < 0 ? '-' : ''}{formatCurrency(Math.abs(entry.amount), entry.currency)}
                    </td>
                    <td className="py-2.5 text-right mono font-semibold">
                      {formatCurrency(runningBalance, entry.currency)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border">
                <td colSpan={4} className="py-3 text-right font-semibold">Balance Due</td>
                <td className="py-3 text-right mono font-bold text-primary">
                  {formatCurrency(runningBalance, entries[0]?.currency || 'ZAR')}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </AppLayout>
  );
}
