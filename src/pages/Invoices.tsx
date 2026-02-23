import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useInvoices, useCompanies } from '@/hooks/useInvoiceStore';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useRecurringInvoices } from '@/hooks/useRecurringInvoices';
import { formatCurrency, calculateTotal } from '@/types/invoice';
import { formatDate } from '@/lib/formatDate';
import type { Currency, InvoiceItem } from '@/types/invoice';
import {
  FileText, Plus, MoreHorizontal, Trash2, Eye, Search, RefreshCw,
  ToggleLeft, ToggleRight, ChevronDown, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import AppLayout from '@/components/AppLayout';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

const PAGE_SIZE = 20;

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  approved: { label: 'Approved', className: 'bg-info/10 text-info border-info/20' },
  sent: { label: 'Awaiting Payment', className: 'bg-warning/10 text-warning border-warning/20' },
  paid: { label: 'Paid', className: 'bg-success/10 text-success border-success/20' },
  overdue: { label: 'Overdue', className: 'bg-overdue/10 text-overdue border-overdue/20' },
};

function RecurringTab() {
  const { recurring: allRecurring, addRecurring, updateRecurring, deleteRecurring } = useRecurringInvoices();
  const { companies } = useCompanies();
  const { activeCompanyId } = useActiveCompany();
  const recurring = activeCompanyId ? allRecurring.filter(r => r.companyId === activeCompanyId) : allRecurring;
  const [open, setOpen] = useState(false);
  const [companyId, setCompanyId] = useState(companies[0]?.id || '');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [currency, setCurrency] = useState<Currency>('ZAR');
  const [taxRate, setTaxRate] = useState(15);
  const [notes, setNotes] = useState('');
  const [frequency, setFrequency] = useState<'monthly' | 'weekly' | 'yearly'>('monthly');
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [nextRunDate, setNextRunDate] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() + 1); d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: uuidv4(), description: '', quantity: 1, unitPrice: 0 },
  ]);

  const resetForm = () => {
    setCompanyId(companies[0]?.id || ''); setClientName(''); setClientEmail('');
    setClientAddress(''); setCurrency('ZAR'); setTaxRate(15); setNotes('');
    setFrequency('monthly'); setDayOfMonth(1);
    setItems([{ id: uuidv4(), description: '', quantity: 1, unitPrice: 0 }]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) { toast.error('Select a company'); return; }
    if (!clientName) { toast.error('Enter client name'); return; }
    const result = await addRecurring({
      companyId, clientName, clientEmail, clientAddress, currency,
      items, taxRate, notes, frequency, dayOfMonth, nextRunDate, isActive: true,
    });
    if (result) { toast.success('Recurring invoice created'); resetForm(); setOpen(false); }
    else { toast.error('Failed to create'); }
  };

  const toggleActive = async (id: string, current: boolean) => {
    await updateRecurring(id, { isActive: !current });
    toast.success(!current ? 'Activated' : 'Paused');
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{recurring.length} recurring template{recurring.length !== 1 ? 's' : ''}</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 rounded-lg"><Plus className="h-4 w-4" /> New Recurring</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>New Recurring Invoice</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Company</Label>
                  <Select value={companyId} onValueChange={setCompanyId}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Customer Name</Label>
                  <Input required value={clientName} onChange={e => setClientName(e.target.value)} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email</Label>
                  <Input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Currency</Label>
                  <Select value={currency} onValueChange={v => setCurrency(v as Currency)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ZAR">ZAR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Address</Label>
                <Textarea value={clientAddress} onChange={e => setClientAddress(e.target.value)} rows={2} />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Frequency</Label>
                  <Select value={frequency} onValueChange={v => setFrequency(v as any)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Day of Month</Label>
                  <Input type="number" min={1} max={28} value={dayOfMonth} onChange={e => setDayOfMonth(parseInt(e.target.value) || 1)} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Next Run</Label>
                  <Input type="date" value={nextRunDate} onChange={e => setNextRunDate(e.target.value)} className="h-9" />
                </div>
              </div>
              <div>
                <Label className="text-xs mb-2 block">Line Items</Label>
                {items.map((item, i) => (
                  <div key={item.id} className="flex gap-2 mb-2">
                    <Input placeholder="Description" value={item.description} onChange={e => { const u = [...items]; u[i] = { ...item, description: e.target.value }; setItems(u); }} className="h-8 text-xs flex-1" />
                    <Input type="number" placeholder="Qty" value={item.quantity} onChange={e => { const u = [...items]; u[i] = { ...item, quantity: parseInt(e.target.value) || 0 }; setItems(u); }} className="h-8 text-xs w-16" />
                    <Input type="number" placeholder="Price" value={item.unitPrice} onChange={e => { const u = [...items]; u[i] = { ...item, unitPrice: parseFloat(e.target.value) || 0 }; setItems(u); }} className="h-8 text-xs w-24" />
                    {items.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setItems(items.filter((_, j) => j !== i))}><Trash2 className="h-3 w-3" /></Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="ghost" size="sm" className="text-primary text-xs" onClick={() => setItems([...items, { id: uuidv4(), description: '', quantity: 1, unitPrice: 0 }])}>
                  <Plus className="h-3 w-3 mr-1" /> Add item
                </Button>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tax Rate (%)</Label>
                <Input type="number" min={0} max={100} value={taxRate} onChange={e => setTaxRate(parseFloat(e.target.value) || 0)} className="h-9 w-24" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Notes</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit">Create Recurring</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {recurring.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-20">
          <RefreshCw className="h-10 w-10 text-muted-foreground/30" />
          <h3 className="mt-4 text-lg font-medium">No recurring invoices</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm text-center">Set up automatic invoicing for repeat clients.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 bg-card invoice-shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/20">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Frequency</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Next Run</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Amount</th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {recurring.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-secondary/40 transition-colors">
                  <td className="px-4 py-3.5 font-medium">{r.clientName}</td>
                  <td className="px-4 py-3.5 capitalize text-muted-foreground">{r.frequency} · Day {r.dayOfMonth}</td>
                  <td className="px-4 py-3.5 text-muted-foreground hidden sm:table-cell">{formatDate(r.nextRunDate)}</td>
                  <td className="px-4 py-3.5 text-right mono font-medium">{formatCurrency(calculateTotal(r.items, r.taxRate), r.currency)}</td>
                  <td className="px-4 py-3.5 text-center">
                    <Badge variant="outline" className={r.isActive ? 'bg-success/10 text-success border-success/20' : 'bg-muted text-muted-foreground'}>
                      {r.isActive ? 'Active' : 'Paused'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleActive(r.id, r.isActive)}>
                        {r.isActive ? <ToggleRight className="h-4 w-4 text-success" /> : <ToggleLeft className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={async () => { await deleteRecurring(r.id); toast.success('Deleted'); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function Invoices() {
  const { invoices, softDeleteInvoice, fetchDeletedInvoices, loading } = useInvoices();
  const { getCompany } = useCompanies();
  const { activeCompanyId } = useActiveCompany();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [deletedInvoices, setDeletedInvoices] = useState<any[]>([]);
  const [page, setPage] = useState(0);

  const activeTab = searchParams.get('tab') || 'all';
  const statusFilter = searchParams.get('status') || null;

  const setTab = (tab: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', tab);
    params.delete('status');
    setSearchParams(params);
  };

  const setStatusFilterParam = (status: string | null) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', 'all');
    if (status) params.set('status', status);
    else params.delete('status');
    setSearchParams(params);
    setPage(0);
  };

  const handleShowDeleted = async () => {
    if (!showDeleted) {
      const deleted = await fetchDeletedInvoices();
      setDeletedInvoices(deleted);
    }
    setShowDeleted(!showDeleted);
    setPage(0);
  };

  const displayInvoices = showDeleted ? deletedInvoices : invoices;

  const companyFiltered = activeCompanyId
    ? displayInvoices.filter(inv => inv.companyId === activeCompanyId)
    : displayInvoices;

  const filtered = companyFiltered.filter((inv) => {
    const matchesSearch = !search || inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) || inv.clientName.toLowerCase().includes(search.toLowerCase());
    if (statusFilter === 'overdue') {
      return matchesSearch && inv.status === 'sent' && new Date(inv.dueDate) < new Date();
    }
    const matchesStatus = !statusFilter || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const showFrom = filtered.length > 0 ? page * PAGE_SIZE + 1 : 0;
  const showTo = Math.min((page + 1) * PAGE_SIZE, filtered.length);

  const statuses = ['draft', 'sent', 'paid', 'overdue'];

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Invoices</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {companyFiltered.length} invoice{companyFiltered.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gap-1.5 rounded-lg">
                <Plus className="h-4 w-4" /> New <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild><Link to="/invoices/new">New Invoice</Link></DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setTab('recurring'); }}>New Recurring Invoice</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex items-center gap-1 border-b border-border/50">
        <button
          onClick={() => setTab('all')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'all' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          All Invoices
        </button>
        <button
          onClick={() => setTab('recurring')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'recurring' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Recurring
        </button>
      </div>

      {activeTab === 'recurring' ? (
        <RecurringTab />
      ) : (
        <>
          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search invoices..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="pl-9 h-9 rounded-lg" />
            </div>
            <div className="flex gap-1 flex-wrap">
              <button
                onClick={() => { setShowDeleted(false); setStatusFilterParam(null); }}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${!statusFilter && !showDeleted ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
              >
                All
              </button>
              {statuses.map((s) => (
                <button key={s} onClick={() => { setShowDeleted(false); setStatusFilterParam(statusFilter === s ? null : s); }}
                  className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${statusFilter === s ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
                >
                  {statusConfig[s]?.label || s}
                </button>
              ))}
              <button onClick={handleShowDeleted}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${showDeleted ? 'bg-destructive text-destructive-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
              >
                Deleted
              </button>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 rounded-lg border bg-card p-4">
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              ))}
            </div>
          ) : companyFiltered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-20">
              <FileText className="h-10 w-10 text-muted-foreground/30" />
              <h3 className="mt-4 text-lg font-medium">No invoices yet</h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-sm text-center">
                Create your first invoice to get started.
              </p>
              <Link to="/invoices/new" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                <Plus className="h-4 w-4" /> Create your first invoice
              </Link>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="rounded-xl border border-border/50 bg-card invoice-shadow overflow-hidden hidden md:block">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/20">
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Invoice</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Customer</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Company</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Due Date</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Amount</th>
                        <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                        <th className="px-4 py-3 w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((inv) => {
                        const company = getCompany(inv.companyId);
                        const isOverdue = inv.status === 'sent' && new Date(inv.dueDate) < new Date();
                        const config = isOverdue ? statusConfig.overdue : (statusConfig[inv.status] || statusConfig.draft);
                        return (
                          <tr key={inv.id} className="border-b last:border-0 hover:bg-secondary/40 transition-colors">
                            <td className="px-4 py-3.5">
                              <Link to={`/invoices/${inv.id}`} className="font-medium text-foreground hover:text-primary mono text-sm">{inv.invoiceNumber}</Link>
                              <p className="text-xs text-muted-foreground mt-0.5">{formatDate(inv.createdAt)}</p>
                            </td>
                            <td className="px-4 py-3.5">{inv.clientName}</td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-2">
                                {company?.logo && <img src={company.logo} alt="" className="h-5 w-5 rounded object-contain" />}
                                <span className="text-muted-foreground">{company?.name || '—'}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-muted-foreground">{formatDate(inv.dueDate)}</td>
                            <td className="px-4 py-3.5 text-right">
                              <span className="mono font-medium">{formatCurrency(calculateTotal(inv.items, inv.taxRate), inv.currency)}</span>
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <Badge variant="outline" className={`${config.className} text-[11px] capitalize`}>
                                {isOverdue ? 'Overdue' : config.label}
                              </Badge>
                            </td>
                            <td className="px-4 py-3.5">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem asChild><Link to={`/invoices/${inv.id}`}><Eye className="mr-2 h-4 w-4" /> View</Link></DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={async () => {
                                      const result = await softDeleteInvoice(inv.id);
                                      if (result.blocked) toast.error(result.error);
                                      else if (result.error) toast.error(result.error);
                                      else toast.success('Invoice moved to deleted');
                                    }}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile cards */}
              <div className="space-y-2 md:hidden">
                {paginated.map((inv) => {
                  const isOverdue = inv.status === 'sent' && new Date(inv.dueDate) < new Date();
                  const config = isOverdue ? statusConfig.overdue : (statusConfig[inv.status] || statusConfig.draft);
                  return (
                    <Link key={inv.id} to={`/invoices/${inv.id}`} className="block rounded-lg border bg-card p-4 invoice-shadow hover:bg-secondary/30 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <span className="mono text-sm font-medium">{inv.invoiceNumber}</span>
                        <Badge variant="outline" className={`${config.className} text-[10px]`}>
                          {isOverdue ? 'Overdue' : config.label}
                        </Badge>
                      </div>
                      <div className="text-sm">{inv.clientName}</div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">Due {formatDate(inv.dueDate)}</span>
                        <span className="mono text-sm font-medium">{formatCurrency(calculateTotal(inv.items, inv.taxRate), inv.currency)}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                  <span>Showing {showFrom}–{showTo} of {filtered.length}</span>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </AppLayout>
  );
}
