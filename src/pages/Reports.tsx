import { useMemo } from 'react';
import { useInvoices } from '@/hooks/useInvoiceStore';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useExpenses } from '@/hooks/useExpenses';
import { usePayments } from '@/hooks/usePayments';
import { formatCurrency, calculateTotal, calculateSubtotal, calculateTax } from '@/types/invoice';
import type { Currency } from '@/types/invoice';
import AppLayout from '@/components/AppLayout';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingUp, Clock, AlertCircle, CheckCircle2, Receipt, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { exportToCsv } from '@/lib/exportCsv';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--warning))', 'hsl(var(--success))', 'hsl(var(--destructive))', 'hsl(var(--info))'];

export default function Reports() {
  const { invoices: allInvoices } = useInvoices();
  const { activeCompanyId } = useActiveCompany();
  const { expenses } = useExpenses();

  const invoices = activeCompanyId ? allInvoices.filter(i => i.companyId === activeCompanyId) : allInvoices;
  const activeInvoices = invoices.filter(i => i.status !== 'voided');
  const currencies = [...new Set(activeInvoices.map(i => i.currency))] as Currency[];
  const primaryCurrency: Currency = currencies[0] || 'ZAR';

  // Revenue by month (last 6 months)
  const revenueByMonth = useMemo(() => {
    const months: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString('en', { month: 'short', year: '2-digit' });
      months[key] = 0;
    }
    activeInvoices.forEach(inv => {
      const d = new Date(inv.createdAt);
      const key = d.toLocaleDateString('en', { month: 'short', year: '2-digit' });
      if (key in months) {
        months[key] += calculateTotal(inv.items, inv.taxRate);
      }
    });
    return Object.entries(months).map(([month, revenue]) => ({ month, revenue }));
  }, [activeInvoices]);

  // Status breakdown
  const statusBreakdown = useMemo(() => {
    const counts = { draft: 0, sent: 0, paid: 0, overdue: 0, partially_paid: 0 };
    activeInvoices.forEach(inv => {
      if (inv.status === 'sent' && new Date(inv.dueDate) < new Date()) {
        counts.overdue++;
      } else if (inv.status === 'partially_paid') {
        counts.partially_paid++;
      } else if (inv.status in counts) {
        counts[inv.status as keyof typeof counts]++;
      }
    });
    return [
      { name: 'Draft', value: counts.draft },
      { name: 'Awaiting', value: counts.sent },
      { name: 'Paid', value: counts.paid },
      { name: 'Overdue', value: counts.overdue },
      { name: 'Partial', value: counts.partially_paid },
    ].filter(s => s.value > 0);
  }, [activeInvoices]);

  // Top customers by revenue
  const topCustomers = useMemo(() => {
    const map: Record<string, { total: number; currency: Currency }> = {};
    activeInvoices.forEach(inv => {
      if (!map[inv.clientName]) map[inv.clientName] = { total: 0, currency: inv.currency };
      map[inv.clientName].total += calculateTotal(inv.items, inv.taxRate);
    });
    return Object.entries(map)
      .map(([name, { total, currency }]) => ({ name, total, currency }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [activeInvoices]);

  // AR Aging
  const aging = useMemo(() => {
    const buckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
    const now = new Date();
    activeInvoices.filter(i => i.status === 'sent' || i.status === 'partially_paid').forEach(inv => {
      const days = Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24));
      const amt = calculateTotal(inv.items, inv.taxRate);
      if (days <= 0) buckets['0-30'] += amt;
      else if (days <= 30) buckets['0-30'] += amt;
      else if (days <= 60) buckets['31-60'] += amt;
      else if (days <= 90) buckets['61-90'] += amt;
      else buckets['90+'] += amt;
    });
    return Object.entries(buckets).map(([range, amount]) => ({ range, amount }));
  }, [activeInvoices]);

  // Tax summary
  const taxSummary = useMemo(() => {
    const months: Record<string, { taxCollected: number; currency: Currency }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString('en', { month: 'short', year: '2-digit' });
      months[key] = { taxCollected: 0, currency: primaryCurrency };
    }
    activeInvoices.filter(i => i.status === 'paid').forEach(inv => {
      const d = new Date(inv.createdAt);
      const key = d.toLocaleDateString('en', { month: 'short', year: '2-digit' });
      if (key in months) {
        months[key].taxCollected += calculateTax(inv.items, inv.taxRate);
      }
    });
    return Object.entries(months).map(([month, { taxCollected }]) => ({ month, tax: taxCollected }));
  }, [activeInvoices, primaryCurrency]);

  // Summary cards grouped by currency
  const summaryByCurrency = useMemo(() => {
    const groups: Record<string, { total: number; paid: number; outstanding: number; overdue: number }> = {};
    activeInvoices.forEach(inv => {
      const c = inv.currency;
      if (!groups[c]) groups[c] = { total: 0, paid: 0, outstanding: 0, overdue: 0 };
      const amt = calculateTotal(inv.items, inv.taxRate);
      groups[c].total += amt;
      if (inv.status === 'paid') groups[c].paid += amt;
      if (inv.status === 'sent' || inv.status === 'partially_paid') {
        groups[c].outstanding += amt;
        if (new Date(inv.dueDate) < new Date()) groups[c].overdue += amt;
      }
    });
    return groups;
  }, [activeInvoices]);

  // P&L data
  const pnlData = useMemo(() => {
    const months: Record<string, { income: number; expenses: number }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString('en', { month: 'short', year: '2-digit' });
      months[key] = { income: 0, expenses: 0 };
    }
    activeInvoices.filter(i => i.status === 'paid').forEach(inv => {
      const d = new Date(inv.createdAt);
      const key = d.toLocaleDateString('en', { month: 'short', year: '2-digit' });
      if (key in months) months[key].income += calculateTotal(inv.items, inv.taxRate);
    });
    expenses.forEach(exp => {
      const d = new Date(exp.date);
      const key = d.toLocaleDateString('en', { month: 'short', year: '2-digit' });
      if (key in months) months[key].expenses += exp.amount;
    });
    return Object.entries(months).map(([month, data]) => ({
      month,
      income: data.income,
      expenses: data.expenses,
      profit: data.income - data.expenses,
    }));
  }, [activeInvoices, expenses]);

  const totalIncome = pnlData.reduce((s, d) => s + d.income, 0);
  const totalExpensesAmt = pnlData.reduce((s, d) => s + d.expenses, 0);
  const netProfit = totalIncome - totalExpensesAmt;

  const chartConfig = {
    revenue: { label: 'Revenue', color: 'hsl(var(--primary))' },
    amount: { label: 'Amount', color: 'hsl(var(--warning))' },
    tax: { label: 'Tax', color: 'hsl(var(--success))' },
    income: { label: 'Income', color: 'hsl(var(--success))' },
    expenses: { label: 'Expenses', color: 'hsl(var(--destructive))' },
  };

  // CSV export handlers
  const exportInvoices = () => {
    exportToCsv('invoices.csv',
      ['Number', 'Client', 'Status', 'Currency', 'Total', 'Due Date', 'Created'],
      activeInvoices.map(i => [i.invoiceNumber, i.clientName, i.status, i.currency, calculateTotal(i.items, i.taxRate).toFixed(2), i.dueDate, i.createdAt.split('T')[0]])
    );
  };
  const exportExpenses = () => {
    exportToCsv('expenses.csv',
      ['Date', 'Category', 'Description', 'Vendor', 'Amount', 'Currency'],
      expenses.map(e => [e.date, e.category, e.description, e.vendor, e.amount.toFixed(2), e.currency])
    );
  };
  const exportPnl = () => {
    exportToCsv('profit-and-loss.csv',
      ['Month', 'Income', 'Expenses', 'Net Profit'],
      pnlData.map(d => [d.month, d.income.toFixed(2), d.expenses.toFixed(2), d.profit.toFixed(2)])
    );
  };

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">View summaries of your invoicing activity.</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm"><Download className="mr-1.5 h-4 w-4" /> Export</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={exportInvoices}>Export Invoices (CSV)</DropdownMenuItem>
            <DropdownMenuItem onClick={exportExpenses}>Export Expenses (CSV)</DropdownMenuItem>
            <DropdownMenuItem onClick={exportPnl}>Export P&L (CSV)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Summary cards by currency */}
      {Object.entries(summaryByCurrency).map(([currency, data]) => (
        <div key={currency} className="mb-6">
          {currencies.length > 1 && (
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">{currency} Summary</h3>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Total Revenue', value: data.total, icon: DollarSign, color: 'text-primary', bg: 'bg-primary/10' },
              { label: 'Paid', value: data.paid, icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
              { label: 'Outstanding', value: data.outstanding, icon: Clock, color: 'text-warning', bg: 'bg-warning/10' },
              { label: 'Overdue', value: data.overdue, icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
            ].map(s => (
              <div key={s.label} className="rounded-xl border border-border/50 bg-card p-5 invoice-shadow">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${s.bg} mb-3`}>
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                </div>
                <p className="text-2xl font-semibold mono">{formatCurrency(s.value, currency as Currency)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* P&L Summary Cards */}
      <div className="mb-6">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Profit & Loss (Last 6 Months)</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border/50 bg-card p-5 invoice-shadow">
            <p className="text-xs text-muted-foreground mb-1">Total Income</p>
            <p className="text-2xl font-semibold mono text-success">{formatCurrency(totalIncome, primaryCurrency)}</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card p-5 invoice-shadow">
            <p className="text-xs text-muted-foreground mb-1">Total Expenses</p>
            <p className="text-2xl font-semibold mono text-destructive">{formatCurrency(totalExpensesAmt, primaryCurrency)}</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card p-5 invoice-shadow">
            <p className="text-xs text-muted-foreground mb-1">Net Profit</p>
            <p className={`text-2xl font-semibold mono ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>{formatCurrency(netProfit, primaryCurrency)}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        {/* P&L Chart */}
        <div className="rounded-xl border border-border/50 bg-card p-5 invoice-shadow">
          <h2 className="text-sm font-semibold mb-4">Income vs Expenses</h2>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <BarChart data={pnlData}>
              <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="income" fill="var(--color-income)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" fill="var(--color-expenses)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </div>

        {/* Revenue by Month */}
        <div className="rounded-xl border border-border/50 bg-card p-5 invoice-shadow">
          <h2 className="text-sm font-semibold mb-4">Revenue by Month</h2>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <BarChart data={revenueByMonth}>
              <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        {/* Status Breakdown */}
        <div className="rounded-xl border border-border/50 bg-card p-5 invoice-shadow">
          <h2 className="text-sm font-semibold mb-4">Invoice Status Breakdown</h2>
          {statusBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">No invoices yet</p>
          ) : (
            <div className="flex items-center gap-6">
              <div className="h-[200px] w-[200px]">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={statusBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45}>
                      {statusBreakdown.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {statusBreakdown.map((s, i) => (
                  <div key={s.name} className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-sm">{s.name}: <span className="font-medium">{s.value}</span></span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Top Customers */}
        <div className="rounded-xl border border-border/50 bg-card p-5 invoice-shadow">
          <h2 className="text-sm font-semibold mb-4">Top Customers by Revenue</h2>
          {topCustomers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No data yet</p>
          ) : (
            <div className="space-y-3">
              {topCustomers.map((c) => {
                const pct = topCustomers[0].total > 0 ? (c.total / topCustomers[0].total) * 100 : 0;
                return (
                  <div key={c.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium truncate max-w-[180px]">{c.name}</span>
                      <span className="mono text-sm font-medium">{formatCurrency(c.total, c.currency)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary/70 transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        {/* AR Aging */}
        <div className="rounded-xl border border-border/50 bg-card p-5 invoice-shadow">
          <h2 className="text-sm font-semibold mb-4">Accounts Receivable Aging</h2>
          <ChartContainer config={{ amount: { label: 'Amount', color: 'hsl(var(--warning))' } }} className="h-[250px] w-full">
            <BarChart data={aging}>
              <XAxis dataKey="range" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="amount" fill="var(--color-amount)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </div>

        {/* Tax Summary */}
        <div className="rounded-xl border border-border/50 bg-card p-5 invoice-shadow">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Receipt className="h-4 w-4" /> Tax Summary (Paid Invoices)
          </h2>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <BarChart data={taxSummary}>
              <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="tax" fill="var(--color-tax)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </div>
      </div>
    </AppLayout>
  );
}
