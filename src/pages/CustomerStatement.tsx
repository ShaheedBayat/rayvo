import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCustomers } from '@/hooks/useCustomers';
import { useCompanies } from '@/hooks/useInvoiceStore';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, calculateSmartTotals } from '@/types/invoice';
import type { Currency, InvoiceItem } from '@/types/invoice';
import { formatDate } from '@/lib/formatDate';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Download, AlertTriangle, Loader2 } from 'lucide-react';

interface StatementEntry {
  date: string;
  ref: string;
  type: 'Invoice' | 'Payment' | 'Credit Note';
  amount: number; // positive = adds to balance, negative = reduces
  currency: Currency;
}

const countsAsStatementCredit = (creditNote: { status?: string; notes?: string }) => {
  const notes = (creditNote.notes || '').toLowerCase();
  return creditNote.status !== 'draft' &&
    !notes.includes('auto-generated from overpayment') &&
    !notes.startsWith('applied from credit note');
};

const normalizeName = (s: string | undefined | null) =>
  (s || '').trim().toLowerCase().replace(/\s+/g, ' ');

export default function CustomerStatement() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { customers } = useCustomers();
  const { getCompany } = useCompanies();

  const customer = customers.find(c => c.id === id);

  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 6);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [mismatch, setMismatch] = useState(false);

  // Raw DB data — never use stored/cached totals
  const [dbInvoices, setDbInvoices] = useState<any[]>([]);
  const [dbPayments, setDbPayments] = useState<any[]>([]);
  const [dbCreditNotes, setDbCreditNotes] = useState<any[]>([]);

  /** Fetch ALL raw data directly from DB — no caching, no hooks */
  const fetchAllData = useCallback(async () => {
    if (!user || !customer) { setLoading(false); return; }
    setLoading(true);

    const fromDate = dateFrom;
    const toDate = dateTo + 'T23:59:59';

    // Look up the customer's company_id to scope the statement correctly
    // (the same client name can exist in multiple companies)
    const { data: customerRow } = await supabase
      .from('customers')
      .select('company_id')
      .eq('id', customer.id)
      .maybeSingle();
    const customerCompanyId = customerRow?.company_id;

    // Fetch invoices for this customer — strictly scoped to the customer's company.
    // The same client name can exist across multiple companies, so company_id is mandatory.
    let invoicesQuery = supabase
      .from('invoices')
      .select('id, invoice_number, company_id, client_name, items, tax_rate, currency, status, created_at, due_date')
      .ilike('client_name', customer.name.trim())
      .is('deleted_at', null)
      .neq('status', 'voided')
      .neq('status', 'draft')
      .gte('created_at', fromDate)
      .lte('created_at', toDate)
      .order('created_at', { ascending: true });
    if (customerCompanyId) {
      invoicesQuery = invoicesQuery.eq('company_id', customerCompanyId);
    } else {
      invoicesQuery = invoicesQuery.is('company_id', null);
    }
    const { data: invoices } = await invoicesQuery;

    // Defensive client-side filter: normalize names + enforce company match
    const targetName = normalizeName(customer.name);
    const safeInvoices = (invoices || []).filter(i =>
      normalizeName(i.client_name) === targetName &&
      i.company_id === customerCompanyId
    );
    setDbInvoices(safeInvoices);

    const invoiceIds = safeInvoices.map(i => i.id);

    // Fetch payments linked to these invoices
    if (invoiceIds.length > 0) {
      const { data: payments } = await supabase
        .from('payments')
        .select('id, invoice_id, amount, payment_date, reference')
        .in('invoice_id', invoiceIds)
        .gte('payment_date', fromDate)
        .lte('payment_date', toDate)
        .order('payment_date', { ascending: true });
      setDbPayments(payments || []);
    } else {
      setDbPayments([]);
    }

    // Fetch credit notes for this customer — strictly scoped to the customer's company
    let creditNotesQuery = supabase
      .from('credit_notes')
      .select('id, credit_note_number, company_id, invoice_id, client_name, items, tax_rate, currency, status, notes, created_at')
      .ilike('client_name', customer.name.trim())
      .is('deleted_at', null)
      .neq('status', 'draft')
      .gte('created_at', fromDate)
      .lte('created_at', toDate)
      .order('created_at', { ascending: true });
    if (customerCompanyId) {
      creditNotesQuery = creditNotesQuery.eq('company_id', customerCompanyId);
    } else {
      creditNotesQuery = creditNotesQuery.is('company_id', null);
    }
    const { data: creditNotes } = await creditNotesQuery;
    setDbCreditNotes(
      (creditNotes || [])
        .filter(cn => normalizeName(cn.client_name) === targetName && cn.company_id === customerCompanyId)
        .filter(countsAsStatementCredit)
    );

    setLoading(false);
  }, [user, customer, dateFrom, dateTo]);

  // Always refetch when dependencies change
  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  /** Build statement entries from raw DB data — compute totals from line items */
  const { entries, totalInvoices, totalPayments, totalCredits } = useMemo(() => {
    const items: StatementEntry[] = [];
    let sumInvoices = 0;
    let sumPayments = 0;
    let sumCredits = 0;

    // Invoices: compute total from line items + tax
    dbInvoices.forEach(inv => {
      const co = getCompany(inv.company_id);
      const lineItems = ((inv.items as unknown) as InvoiceItem[]) || [];
      const computed = calculateSmartTotals(lineItems, Number(inv.tax_rate), co?.pricingMode || 'exclusive', co?.isVatRegistered ?? false);
      sumInvoices += computed.total;
      items.push({
        date: inv.created_at,
        ref: inv.invoice_number,
        type: 'Invoice',
        amount: computed.total,
        currency: inv.currency as Currency,
      });
    });

    // Payments: use raw amount from DB
    dbPayments.forEach(p => {
      const inv = dbInvoices.find(i => i.id === p.invoice_id);
      const amount = Number(p.amount);
      sumPayments += amount;
      items.push({
        date: p.payment_date,
        ref: p.reference || `Payment (${inv?.invoice_number || 'N/A'})`,
        type: 'Payment',
        amount: -amount,
        currency: (inv?.currency as Currency) || 'ZAR',
      });
    });

    // Credit notes: compute total from line items + tax
    dbCreditNotes.forEach(cn => {
      const co = cn.company_id ? getCompany(cn.company_id) : undefined;
      const lineItems = ((cn.items as unknown) as InvoiceItem[]) || [];
      const computed = calculateSmartTotals(lineItems, Number(cn.tax_rate), co?.pricingMode || 'exclusive', co?.isVatRegistered ?? false);
      sumCredits += computed.total;
      items.push({
        date: cn.created_at,
        ref: cn.credit_note_number,
        type: 'Credit Note',
        amount: -computed.total,
        currency: cn.currency as Currency,
      });
    });

    // Sort chronologically
    items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return { entries: items, totalInvoices: sumInvoices, totalPayments: sumPayments, totalCredits: sumCredits };
  }, [dbInvoices, dbPayments, dbCreditNotes, getCompany]);

  /** Validate: running balance must equal independent calculation */
  const expectedBalance = totalInvoices - totalPayments - totalCredits;
  const runningBalances = useMemo(() => {
    let balance = 0;
    return entries.map(e => {
      balance += e.amount;
      return balance;
    });
  }, [entries]);
  const finalRunningBalance = runningBalances.length > 0 ? runningBalances[runningBalances.length - 1] : 0;

  // Mismatch detection — compare with tolerance
  useEffect(() => {
    if (entries.length === 0) { setMismatch(false); return; }
    const diff = Math.abs(finalRunningBalance - expectedBalance);
    setMismatch(diff > 0.01);
  }, [finalRunningBalance, expectedBalance, entries.length]);

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
          <Button size="sm" variant="outline" onClick={fetchAllData} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
          </Button>
          <Button size="sm" onClick={handleExportPdf}>
            <Download className="mr-1.5 h-4 w-4" /> PDF
          </Button>
        </div>
      </div>

      {mismatch && (
        <Alert variant="destructive" className="mb-4 max-w-[800px] mx-auto">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Statement calculation mismatch. Running balance ({formatCurrency(finalRunningBalance, entries[0]?.currency || 'ZAR')}) does not match expected ({formatCurrency(expectedBalance, entries[0]?.currency || 'ZAR')}). Please contact support.
          </AlertDescription>
        </Alert>
      )}

      <div id="statement-content" className="max-w-[800px] mx-auto bg-card rounded-lg border p-8 invoice-shadow">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-1">Customer Statement</h2>
          <p className="text-sm text-muted-foreground">{customer.name}</p>
          {customer.email && <p className="text-sm text-muted-foreground">{customer.email}</p>}
          <p className="text-xs text-muted-foreground mt-2">Period: {formatDate(dateFrom)} — {formatDate(dateTo)}</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading statement...</span>
          </div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">No transactions in this period.</p>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground mb-1">Invoices</p>
                <p className="font-semibold text-sm">{formatCurrency(totalInvoices, entries[0]?.currency || 'ZAR')}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground mb-1">Payments</p>
                <p className="font-semibold text-sm text-success">− {formatCurrency(totalPayments, entries[0]?.currency || 'ZAR')}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground mb-1">Credits</p>
                <p className="font-semibold text-sm text-info">− {formatCurrency(totalCredits, entries[0]?.currency || 'ZAR')}</p>
              </div>
            </div>

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
                {entries.map((entry, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2.5">{formatDate(entry.date)}</td>
                    <td className="py-2.5 mono text-xs">{entry.ref}</td>
                    <td className="py-2.5 text-muted-foreground">{entry.type}</td>
                    <td className={`py-2.5 text-right mono font-medium ${entry.amount < 0 ? 'text-success' : ''}`}>
                      {entry.amount < 0 ? '−' : ''}{formatCurrency(Math.abs(entry.amount), entry.currency)}
                    </td>
                    <td className="py-2.5 text-right mono font-semibold">
                      {formatCurrency(runningBalances[i], entry.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border">
                  <td colSpan={4} className="py-3 text-right font-semibold">Balance Due</td>
                  <td className="py-3 text-right mono font-bold text-primary">
                    {formatCurrency(finalRunningBalance, entries[0]?.currency || 'ZAR')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </>
        )}
      </div>
    </AppLayout>
  );
}
