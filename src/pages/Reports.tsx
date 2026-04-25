import { useState, useMemo } from 'react';
import { useInvoices } from '@/hooks/useInvoiceStore';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useExpenses } from '@/hooks/useExpenses';
import { useAllPayments } from '@/hooks/usePayments';
import { formatCurrency, calculateSmartTotals } from '@/types/invoice';
import { useCompanies } from '@/hooks/useInvoiceStore';
import type { Currency } from '@/types/invoice';
import AppLayout from '@/components/AppLayout';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { TrendingUp, Clock, AlertCircle, CheckCircle2, Receipt, Download, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { exportToCsv } from '@/lib/exportCsv';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--warning))', 'hsl(var(--success))', 'hsl(var(--destructive))', 'hsl(var(--info))'];

function formatAxisValue(v: number): string {
  if (v === 0) return '0';
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`;
  return v.toFixed(0);
}

function rangeToMonthCount(range: string): number {
  switch (range) {
    case '1m': return 1;
    case '3m': return 3;
    case '6m': return 6;
    case '12m': return 12;
    default: return 6;
  }
}

/** Build month buckets between two dates (inclusive of months touched). */
function getMonthsBetween(start: Date, end: Date): Record<string, number> {
  const months: Record<string, number> = {};
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cursor <= last) {
    const key = cursor.toLocaleDateString('en', { month: 'short', year: '2-digit' });
    months[key] = 0;
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

export default function Reports() {
  const [dateRange, setDateRange] = useState('6m');
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();
  const { invoices: allInvoices } = useInvoices();
  const { getCompany } = useCompanies();
  const { activeCompanyId, activeCompany } = useActiveCompany();
  const { expenses } = useExpenses();
  const { payments: allPayments, paidForInvoice } = useAllPayments();

  const getInvoiceTotal = (inv: typeof allInvoices[0]) => {
    const company = getCompany(inv.companyId);
    const pricingMode = company?.pricingMode || 'exclusive';
    const isVat = company?.isVatRegistered ?? false;
    return calculateSmartTotals(inv.items, inv.taxRate, pricingMode, isVat).total;
  };

  const getInvoiceTax = (inv: typeof allInvoices[0]) => {
    const company = getCompany(inv.companyId);
    const pricingMode = company?.pricingMode || 'exclusive';
    const isVat = company?.isVatRegistered ?? false;
    return calculateSmartTotals(inv.items, inv.taxRate, pricingMode, isVat).tax;
  };

  const invoices = activeCompanyId ? allInvoices.filter(i => i.companyId === activeCompanyId) : allInvoices;
  const activeInvoices = invoices.filter(i => i.status !== 'voided');
  const currencies = [...new Set(activeInvoices.map(i => i.currency))] as Currency[];
  const primaryCurrency: Currency = currencies[0] || 'ZAR';

  // Resolve effective start/end based on selected range (custom uses pickers)
  const { rangeStart, rangeEnd } = useMemo(() => {
    const now = new Date();
    if (dateRange === 'custom' && customStart && customEnd) {
      const s = customStart < customEnd ? customStart : customEnd;
      const e = customStart < customEnd ? customEnd : customStart;
      return { rangeStart: new Date(s.getFullYear(), s.getMonth(), s.getDate()), rangeEnd: new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59) };
    }
    const count = rangeToMonthCount(dateRange);
    return {
      rangeStart: new Date(now.getFullYear(), now.getMonth() - count + 1, 1),
      rangeEnd: now,
    };
  }, [dateRange, customStart, customEnd]);

  const revenueByMonth = useMemo(() => {
    const months = getMonthsBetween(rangeStart, rangeEnd);
    const invoiceIds = new Set(activeInvoices.map(i => i.id));
    allPayments.filter(p => {
      const d = new Date(p.paymentDate);
      return invoiceIds.has(p.invoiceId) && d >= rangeStart && d <= rangeEnd;
    }).forEach(p => {
      const d = new Date(p.paymentDate);
      const key = d.toLocaleDateString('en', { month: 'short', year: '2-digit' });
      if (key in months) months[key] += p.amount;
    });
    return Object.entries(months).map(([month, revenue]) => ({ month, revenue }));
  }, [activeInvoices, allPayments, rangeStart, rangeEnd]);

  const statusBreakdown = useMemo(() => {
    const counts = { draft: 0, sent: 0, paid: 0, overdue: 0, partially_paid: 0 };
    activeInvoices.forEach(inv => {
      if (inv.status === 'sent' && new Date(inv.dueDate) < new Date()) counts.overdue++;
      else if (inv.status === 'partially_paid') counts.partially_paid++;
      else if (inv.status in counts) counts[inv.status as keyof typeof counts]++;
    });
    return [
      { name: 'Draft', value: counts.draft },
      { name: 'Awaiting', value: counts.sent },
      { name: 'Paid', value: counts.paid },
      { name: 'Overdue', value: counts.overdue },
      { name: 'Partial', value: counts.partially_paid },
    ].filter(s => s.value > 0);
  }, [activeInvoices]);

  const topCustomers = useMemo(() => {
    const invoiceIds = new Set(activeInvoices.map(i => i.id));
    const invoiceMap = new Map(activeInvoices.map(i => [i.id, i]));
    const map: Record<string, { total: number; currency: Currency }> = {};
    allPayments.filter(p => invoiceIds.has(p.invoiceId)).forEach(p => {
      const inv = invoiceMap.get(p.invoiceId);
      if (!inv) return;
      if (!map[inv.clientName]) map[inv.clientName] = { total: 0, currency: inv.currency };
      map[inv.clientName].total += p.amount;
    });
    return Object.entries(map).map(([name, { total, currency }]) => ({ name, total, currency })).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [activeInvoices, allPayments]);

  const aging = useMemo(() => {
    const buckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
    const now = new Date();
    activeInvoices.filter(i => i.status === 'sent' || i.status === 'partially_paid').forEach(inv => {
      const days = Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24));
      const balance = getInvoiceTotal(inv) - paidForInvoice(inv.id);
      if (balance <= 0) return;
      if (days <= 30) buckets['0-30'] += balance;
      else if (days <= 60) buckets['31-60'] += balance;
      else if (days <= 90) buckets['61-90'] += balance;
      else buckets['90+'] += balance;
    });
    return Object.entries(buckets).map(([range, amount]) => ({ range, amount }));
  }, [activeInvoices, paidForInvoice]);

  const isVatRegistered = activeCompany?.isVatRegistered ?? false;
  const taxSummary = useMemo(() => {
    const months = getMonthsBetween(rangeStart, rangeEnd);
    if (isVatRegistered) {
      activeInvoices.filter(i => i.status === 'paid').forEach(inv => {
        const company = getCompany(inv.companyId);
        if (!company?.isVatRegistered) return;
        const d = new Date(inv.createdAt);
        if (d < rangeStart || d > rangeEnd) return;
        const key = d.toLocaleDateString('en', { month: 'short', year: '2-digit' });
        if (key in months) months[key] += getInvoiceTax(inv);
      });
    }
    return Object.entries(months).map(([month, tax]) => ({ month, tax }));
  }, [activeInvoices, isVatRegistered, rangeStart, rangeEnd]);

  const summaryByCurrency = useMemo(() => {
    const groups: Record<string, { paid: number; outstanding: number; overdue: number }> = {};
    activeInvoices.forEach(inv => {
      const c = inv.currency;
      if (!groups[c]) groups[c] = { paid: 0, outstanding: 0, overdue: 0 };
      const paid = paidForInvoice(inv.id);
      const balance = Math.max(0, getInvoiceTotal(inv) - paid);
      groups[c].paid += paid;
      if (inv.status === 'sent' || inv.status === 'partially_paid') {
        groups[c].outstanding += balance;
        if (new Date(inv.dueDate) < new Date()) groups[c].overdue += balance;
      }
    });
    return groups;
  }, [activeInvoices, paidForInvoice]);

  const pnlData = useMemo(() => {
    const baseMonths = getMonthsBetween(rangeStart, rangeEnd);
    const months: Record<string, { income: number; expenses: number }> = {};
    Object.keys(baseMonths).forEach(k => { months[k] = { income: 0, expenses: 0 }; });
    const invoiceIds = new Set(activeInvoices.map(i => i.id));
    allPayments.filter(p => {
      const d = new Date(p.paymentDate);
      return invoiceIds.has(p.invoiceId) && d >= rangeStart && d <= rangeEnd;
    }).forEach(p => {
      const d = new Date(p.paymentDate);
      const key = d.toLocaleDateString('en', { month: 'short', year: '2-digit' });
      if (key in months) months[key].income += p.amount;
    });
    expenses.filter(exp => {
      const d = new Date(exp.date);
      return d >= rangeStart && d <= rangeEnd;
    }).forEach(exp => {
      const d = new Date(exp.date);
      const key = d.toLocaleDateString('en', { month: 'short', year: '2-digit' });
      if (key in months) months[key].expenses += exp.amount;
    });
    return Object.entries(months).map(([month, data]) => ({ month, income: data.income, expenses: data.expenses, profit: data.income - data.expenses }));
  }, [activeInvoices, allPayments, expenses, rangeStart, rangeEnd]);

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

  const exportInvoices = () => {
    exportToCsv('invoices.csv',
      ['Number', 'Client', 'Status', 'Currency', 'Total', 'Due Date', 'Created'],
      activeInvoices.map(i => [i.invoiceNumber, i.clientName, i.status, i.currency, getInvoiceTotal(i).toFixed(2), i.dueDate, i.createdAt.split('T')[0]])
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

  const rangeLabel = useMemo(() => {
    if (dateRange === 'custom' && customStart && customEnd) {
      return `${format(rangeStart, 'MMM d, yyyy')} – ${format(rangeEnd, 'MMM d, yyyy')}`;
    }
    switch (dateRange) {
      case '1m': return 'Last Month';
      case '3m': return 'Last Quarter';
      case '6m': return 'Last 6 Months';
      case '12m': return 'Last 12 Months';
      default: return 'Last 6 Months';
    }
  }, [dateRange, customStart, customEnd, rangeStart, rangeEnd]);

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">Financial summaries and analytics.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="h-9 w-[180px]">
              <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1m">Last Month</SelectItem>
              <SelectItem value="3m">Last Quarter</SelectItem>
              <SelectItem value="6m">Last 6 Months</SelectItem>
              <SelectItem value="12m">Last 12 Months</SelectItem>
              <SelectItem value="custom">Custom Range…</SelectItem>
            </SelectContent>
          </Select>
          {dateRange === 'custom' && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                  {customStart && customEnd
                    ? `${format(customStart, 'MMM d')} – ${format(customEnd, 'MMM d, yyyy')}`
                    : 'Pick dates'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3 space-y-3" align="end">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs mb-1 block">Start</Label>
                    <Calendar
                      mode="single"
                      selected={customStart}
                      onSelect={setCustomStart}
                      className={cn('p-0 pointer-events-auto')}
                      disabled={(d) => d > new Date()}
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">End</Label>
                    <Calendar
                      mode="single"
                      selected={customEnd}
                      onSelect={setCustomEnd}
                      className={cn('p-0 pointer-events-auto')}
                      disabled={(d) => d > new Date() || (customStart ? d < customStart : false)}
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
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
      </div>

      {/* Summary cards */}
      {Object.entries(summaryByCurrency).map(([currency, data]) => (
        <div key={currency} className="mb-6">
          {currencies.length > 1 && (
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">{currency} Summary</h3>
          )}
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: 'Paid', value: data.paid, icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10', to: '/invoices?status=paid' },
              { label: 'Outstanding', value: data.outstanding, icon: Clock, color: 'text-warning', bg: 'bg-warning/10', to: '/invoices?status=sent' },
              { label: 'Overdue', value: data.overdue, icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/10', to: '/invoices?status=overdue' },
            ].map(s => (
              <Link
                key={s.label}
                to={s.to}
                className="group rounded-xl border border-border/50 bg-card p-5 invoice-shadow transition-all hover:border-primary/40 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${s.bg} mb-3`}>
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                </div>
                <p className="text-2xl font-semibold">{formatCurrency(s.value, currency as Currency)}</p>
                <p className="text-xs text-muted-foreground mt-0.5 group-hover:text-foreground transition-colors">{s.label}</p>
              </Link>
            ))}
          </div>
        </div>
      ))}

      {/* P&L Summary */}
      <div className="mb-6">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Profit & Loss ({rangeLabel})</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border/50 bg-card p-5 invoice-shadow">
            <p className="text-xs text-muted-foreground mb-1">Total Income</p>
            <p className="text-2xl font-semibold text-success">{formatCurrency(totalIncome, primaryCurrency)}</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card p-5 invoice-shadow">
            <p className="text-xs text-muted-foreground mb-1">Total Expenses</p>
            <p className="text-2xl font-semibold text-destructive">{formatCurrency(totalExpensesAmt, primaryCurrency)}</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card p-5 invoice-shadow">
            <p className="text-xs text-muted-foreground mb-1">Net Profit</p>
            <p className={`text-2xl font-semibold ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>{formatCurrency(netProfit, primaryCurrency)}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        <div className="rounded-xl border border-border/50 bg-card p-5 invoice-shadow">
          <h2 className="text-sm font-semibold mb-4">Income vs Expenses</h2>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <BarChart data={pnlData}>
              <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} tickFormatter={formatAxisValue} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="income" fill="var(--color-income)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" fill="var(--color-expenses)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </div>

        <div className="rounded-xl border border-border/50 bg-card p-5 invoice-shadow">
          <h2 className="text-sm font-semibold mb-4">Revenue by Month</h2>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <BarChart data={revenueByMonth}>
              <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} tickFormatter={formatAxisValue} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-8">
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
                      {statusBreakdown.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
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
                      <span className="text-sm font-medium">{formatCurrency(c.total, c.currency)}</span>
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
        <div className="rounded-xl border border-border/50 bg-card p-5 invoice-shadow">
          <h2 className="text-sm font-semibold mb-4">Accounts Receivable Aging</h2>
          <ChartContainer config={{ amount: { label: 'Amount', color: 'hsl(var(--warning))' } }} className="h-[250px] w-full">
            <BarChart data={aging}>
              <XAxis dataKey="range" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} tickFormatter={formatAxisValue} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="amount" fill="var(--color-amount)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </div>

        <div className="rounded-xl border border-border/50 bg-card p-5 invoice-shadow">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Receipt className="h-4 w-4" /> Tax Summary (Paid Invoices)
          </h2>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <BarChart data={taxSummary}>
              <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} tickFormatter={formatAxisValue} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="tax" fill="var(--color-tax)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </div>
      </div>
    </AppLayout>
  );
}
