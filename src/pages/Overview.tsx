import { Link } from 'react-router-dom';
import { useInvoices, useCompanies } from '@/hooks/useInvoiceStore';
import { formatCurrency, calculateTotal } from '@/types/invoice';
import { FileText, Plus, Users, Package, TrendingUp, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import AppLayout from '@/components/AppLayout';

export default function Overview() {
  const { invoices } = useInvoices();
  const { companies } = useCompanies();

  const draft = invoices.filter(i => i.status === 'draft');
  const sent = invoices.filter(i => i.status === 'sent');
  const paid = invoices.filter(i => i.status === 'paid');

  const totalOutstanding = sent.reduce(
    (sum, inv) => sum + calculateTotal(inv.items, inv.taxRate),
    0
  );
  const totalPaid = paid.reduce(
    (sum, inv) => sum + calculateTotal(inv.items, inv.taxRate),
    0
  );
  const totalReceived = totalPaid;

  const currency = invoices[0]?.currency || 'ZAR';

  const stats = [
    {
      label: 'Draft',
      value: draft.length,
      icon: FileText,
      color: 'text-muted-foreground',
      bg: 'bg-muted',
    },
    {
      label: 'Awaiting Payment',
      value: sent.length,
      icon: Clock,
      color: 'text-warning',
      bg: 'bg-warning/10',
    },
    {
      label: 'Paid',
      value: paid.length,
      icon: CheckCircle2,
      color: 'text-success',
      bg: 'bg-success/10',
    },
    {
      label: 'Total Invoices',
      value: invoices.length,
      icon: TrendingUp,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
  ];

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A snapshot of your invoicing activity.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-lg border bg-card p-5 invoice-shadow"
          >
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${s.bg}`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-semibold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Money summary */}
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <div className="rounded-lg border bg-card p-6 invoice-shadow">
          <p className="text-sm text-muted-foreground mb-1">Outstanding</p>
          <p className="text-2xl font-semibold mono text-warning">
            {formatCurrency(totalOutstanding, currency)}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-6 invoice-shadow">
          <p className="text-sm text-muted-foreground mb-1">Paid</p>
          <p className="text-2xl font-semibold mono text-success">
            {formatCurrency(totalPaid, currency)}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-6 invoice-shadow">
          <p className="text-sm text-muted-foreground mb-1">Total Received</p>
          <p className="text-2xl font-semibold mono text-primary">
            {formatCurrency(totalReceived, currency)}
          </p>
        </div>
      </div>

      {/* Quick actions */}
      {invoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20">
          <FileText className="h-10 w-10 text-muted-foreground/40" />
          <h3 className="mt-4 text-lg font-medium">Welcome to RayVo</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm text-center">
            Create your first invoice to start tracking payments and managing your sales.
          </p>
          <Link
            to="/invoices/new"
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create your first invoice
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-6 invoice-shadow">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4">
            Recent Invoices
          </h2>
          <div className="space-y-3">
            {invoices.slice(0, 5).map((inv) => {
              const total = calculateTotal(inv.items, inv.taxRate);
              return (
                <Link
                  key={inv.id}
                  to={`/invoices/${inv.id}`}
                  className="flex items-center justify-between rounded-md px-3 py-2.5 hover:bg-secondary/60 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="mono text-sm font-medium">{inv.invoiceNumber}</span>
                    <span className="text-sm text-muted-foreground">{inv.clientName}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="mono text-sm font-medium">
                      {formatCurrency(total, inv.currency)}
                    </span>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
                        inv.status === 'paid'
                          ? 'bg-success/10 text-success'
                          : inv.status === 'sent'
                          ? 'bg-warning/10 text-warning'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {inv.status}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
