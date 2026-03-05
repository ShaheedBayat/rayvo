import { Link } from 'react-router-dom';
import { useInvoices, useCompanies } from '@/hooks/useInvoiceStore';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { formatCurrency, calculateTotal, calculateSmartTotals, currencySymbols } from '@/types/invoice';
import { formatDate } from '@/lib/formatDate';
import type { Currency } from '@/types/invoice';
import {
  FileText, Plus, TrendingUp, Clock, CheckCircle2, AlertCircle,
  ArrowUpRight, Send, Building2,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import AppLayout from '@/components/AppLayout';

export default function Overview() {
  const { invoices: allInvoices, loading } = useInvoices();
  const { companies } = useCompanies();
  const { activeCompanyId } = useActiveCompany();

  const invoices = activeCompanyId
    ? allInvoices.filter(i => i.companyId === activeCompanyId)
    : allInvoices;

  // Filter out voided
  const activeInvoices = invoices.filter(i => i.status !== 'voided');

  const draft = activeInvoices.filter(i => i.status === 'draft');
  const sent = activeInvoices.filter(i => i.status === 'sent' || i.status === 'partially_paid');
  const paid = activeInvoices.filter(i => i.status === 'paid');
  const overdue = activeInvoices.filter(i => {
    if (i.status !== 'sent' && i.status !== 'partially_paid') return false;
    return new Date(i.dueDate) < new Date();
  });

  // Group by currency
  const currencies = [...new Set(activeInvoices.map(i => i.currency))] as Currency[];
  const primaryCurrency: Currency = currencies[0] || 'ZAR';

  const getInvoiceTotal = (inv: typeof activeInvoices[0]) => {
    const company = companies.find(c => c.id === inv.companyId);
    const pricingMode = company?.pricingMode || 'exclusive';
    const isVat = company?.isVatRegistered ?? false;
    return calculateSmartTotals(inv.items, inv.taxRate, pricingMode, isVat).total;
  };

  const byCurrency = (invs: typeof activeInvoices) => {
    const groups: Record<string, number> = {};
    invs.forEach(inv => {
      const c = inv.currency;
      groups[c] = (groups[c] || 0) + getInvoiceTotal(inv);
    });
    return groups;
  };

  const outstandingByCurrency = byCurrency(sent);
  const paidByCurrency = byCurrency(paid);
  const overdueByCurrency = byCurrency(overdue);

  const formatMultiCurrency = (groups: Record<string, number>) => {
    const entries = Object.entries(groups).filter(([, v]) => v > 0);
    if (entries.length === 0) return formatCurrency(0, primaryCurrency);
    if (entries.length === 1) return formatCurrency(entries[0][1], entries[0][0] as Currency);
    return entries.map(([c, v]) => formatCurrency(v, c as Currency)).join(' · ');
  };

  const customerOwing: Record<string, { name: string; amount: number; currency: Currency }> = {};
  sent.forEach(inv => {
    const total = getInvoiceTotal(inv);
    if (!customerOwing[inv.clientName]) {
      customerOwing[inv.clientName] = { name: inv.clientName, amount: 0, currency: inv.currency };
    }
    customerOwing[inv.clientName].amount += total;
  });
  const topOwing = Object.values(customerOwing)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const stats = [
    { label: 'Draft', value: draft.length, icon: FileText, color: 'text-muted-foreground', bg: 'bg-muted' },
    { label: 'Awaiting Payment', value: sent.length, icon: Clock, color: 'text-warning', bg: 'bg-warning/10' },
    { label: 'Overdue', value: overdue.length, icon: AlertCircle, color: 'text-overdue', bg: 'bg-overdue/10' },
    { label: 'Paid', value: paid.length, icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
    { label: 'Total Invoices', value: activeInvoices.length, icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/10' },
  ];

  // Empty state: no companies yet
  if (!loading && companies.length === 0) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-24">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 mb-6">
            <Building2 className="h-10 w-10 text-primary/50" />
          </div>
          <h1 className="text-2xl font-semibold mb-2">Welcome to RayVo</h1>
          <p className="text-muted-foreground text-center max-w-md mb-8">
            To get started, create your first company. This will be your business identity on all invoices, quotes, and documents.
          </p>
          <Link
            to="/companies?action=new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> Create your first company
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Sales Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A snapshot of your invoicing activity.
        </p>
      </div>

      {/* KPI Stats */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-8">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border/50 bg-card p-5 invoice-shadow">
              <Skeleton className="h-9 w-9 rounded-lg mb-3" />
              <Skeleton className="h-7 w-16 mb-1" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-8">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-border/50 bg-card p-5 invoice-shadow hover:invoice-shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${s.bg}`}>
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/40" />
              </div>
              <p className="text-2xl font-semibold">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Money summary */}
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <div className="rounded-xl border border-border/50 bg-card p-6 invoice-shadow">
          <div className="flex items-center gap-2 mb-2">
            <Send className="h-4 w-4 text-warning" />
            <p className="text-sm font-medium text-muted-foreground">Outstanding</p>
          </div>
          <p className="text-xl font-semibold mono text-warning">
            {formatMultiCurrency(outstandingByCurrency)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{sent.length} invoice{sent.length !== 1 ? 's' : ''} pending</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-6 invoice-shadow">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <p className="text-sm font-medium text-muted-foreground">Received</p>
          </div>
          <p className="text-xl font-semibold mono text-success">
            {formatMultiCurrency(paidByCurrency)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{paid.length} invoice{paid.length !== 1 ? 's' : ''} paid</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-6 invoice-shadow">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-overdue" />
            <p className="text-sm font-medium text-muted-foreground">Overdue</p>
          </div>
          <p className="text-xl font-semibold mono text-overdue">
            {formatMultiCurrency(overdueByCurrency)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{overdue.length} invoice{overdue.length !== 1 ? 's' : ''} overdue</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Recent Invoices */}
        <div className="lg:col-span-3">
          {activeInvoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-20">
              <FileText className="h-10 w-10 text-muted-foreground/30" />
              <h3 className="mt-4 text-lg font-medium">No invoices yet</h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-sm text-center">
                Create your first invoice to start tracking payments.
              </p>
              <Link
                to="/invoices/new"
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-4 w-4" /> Create your first invoice
              </Link>
            </div>
          ) : (
            <div className="rounded-xl border border-border/50 bg-card invoice-shadow">
              <div className="flex items-center justify-between p-5 pb-0">
                <h2 className="text-sm font-semibold">Recent Invoices</h2>
                <Link to="/invoices" className="text-xs text-primary hover:underline">View all</Link>
              </div>
              <div className="p-3">
                {activeInvoices.slice(0, 6).map((inv) => {
                  const total = getInvoiceTotal(inv);
                  const isOverdue = (inv.status === 'sent' || inv.status === 'partially_paid') && new Date(inv.dueDate) < new Date();
                  return (
                    <Link
                      key={inv.id}
                      to={`/invoices/${inv.id}`}
                      className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-secondary/60 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="mono text-sm font-medium">{inv.invoiceNumber}</span>
                        <span className="text-sm text-muted-foreground truncate">{inv.clientName}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="mono text-sm font-medium">
                          {formatCurrency(total, inv.currency)}
                        </span>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
                            inv.status === 'paid'
                              ? 'bg-success/10 text-success'
                              : isOverdue
                              ? 'bg-overdue/10 text-overdue'
                              : inv.status === 'sent'
                              ? 'bg-warning/10 text-warning'
                              : inv.status === 'partially_paid'
                              ? 'bg-info/10 text-info'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {isOverdue ? 'Overdue' : inv.status === 'sent' ? 'Awaiting' : inv.status === 'partially_paid' ? 'Partial' : inv.status}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Customers Owing Most */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border/50 bg-card p-5 invoice-shadow">
            <h2 className="text-sm font-semibold mb-4">Customers Owing Most</h2>
            {topOwing.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No outstanding balances</p>
            ) : (
              <div className="space-y-3">
                {topOwing.map((customer) => {
                  const percent = topOwing[0].amount > 0 ? (customer.amount / topOwing[0].amount) * 100 : 0;
                  return (
                    <div key={customer.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium truncate max-w-[140px]">{customer.name}</span>
                        <span className="mono text-sm text-warning font-medium">
                          {formatCurrency(customer.amount, customer.currency)}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-warning/70 transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
