import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Link, useSearchParams } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { useInvoices, useCompanies } from '@/hooks/useInvoiceStore';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useRecurringInvoices } from '@/hooks/useRecurringInvoices';
import { formatCurrency, calculateSmartTotals } from '@/types/invoice';
import { formatDate } from '@/lib/formatDate';
import type { Currency } from '@/types/invoice';
import {
  FileText, Plus, MoreHorizontal, Trash2, Eye, Search, RefreshCw,
  ToggleLeft, ToggleRight, ChevronDown, ChevronLeft, ChevronRight, Ban, Pencil,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import AppLayout from '@/components/AppLayout';
import { toast } from 'sonner';

const PAGE_SIZE = 20;

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  approved: { label: 'Approved', className: 'bg-info/10 text-info border-info/20' },
  sent: { label: 'Awaiting Payment', className: 'bg-warning/10 text-warning border-warning/20' },
  paid: { label: 'Paid', className: 'bg-success/10 text-success border-success/20' },
  overdue: { label: 'Overdue', className: 'bg-overdue/10 text-overdue border-overdue/20' },
  voided: { label: 'Voided', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  partially_paid: { label: 'Partially Paid', className: 'bg-info/10 text-info border-info/20' },
};

function RecurringTab({ refetchInvoices, canManage }: { refetchInvoices: () => Promise<void>; canManage: boolean }) {
  const { recurring: allRecurring, updateRecurring, deleteRecurring, refetch: refetchRecurring } = useRecurringInvoices();
  const { companies } = useCompanies();
  const { activeCompanyId } = useActiveCompany();
  const recurring = activeCompanyId ? allRecurring.filter(r => r.companyId === activeCompanyId) : allRecurring;

  const toggleActive = async (id: string, current: boolean) => {
    await updateRecurring(id, { isActive: !current });
    toast.success(!current ? 'Activated' : 'Paused');
  };

  const handleGenerate = async (r: typeof recurring[0]) => {
    try {
      const { data, error } = await supabase.functions.invoke('process-recurring-invoices', {
        body: { recurringId: r.id },
      });
      console.log('Recurring generation result:', data);
      if (error) { console.error('Generation error:', error); toast.error('Failed to generate invoice'); return; }
      if (data?.created > 0) {
        const invoiceNum = data?.createdInvoices?.[0]?.invoice_number || 'new invoice';
        toast.success(`Invoice ${invoiceNum} created`);
        await Promise.all([refetchRecurring(), refetchInvoices()]);
      } else {
        const reason = data?.skipped?.[0] || 'No invoice generated';
        console.warn('Skipped:', reason);
        toast.info(reason);
      }
    } catch (err) { console.error('Generate failed:', err); toast.error('Failed to generate invoice'); }
  };

  const formatFrequency = (r: typeof recurring[0]) => {
    if (r.frequency === 'weekly') return 'Weekly';
    if (r.frequency === 'monthly') return `Monthly (Day ${r.dayOfMonth})`;
    if (r.frequency === 'yearly') return 'Yearly';
    return r.frequency;
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{recurring.length} recurring template{recurring.length !== 1 ? 's' : ''}</p>
        {canManage && (
          <Button size="sm" className="gap-1.5 rounded-lg" asChild>
            <Link to="/invoices/recurring/new"><Plus className="h-4 w-4" /> New Recurring</Link>
          </Button>
        )}
      </div>

      {recurring.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-20">
          <RefreshCw className="h-10 w-10 text-muted-foreground/30" />
          <h3 className="mt-4 text-lg font-medium">No recurring templates</h3>
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
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground hidden md:table-cell">Last Generated</th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {recurring.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-secondary/40 transition-colors">
                  <td className="px-4 py-3.5 font-medium">{r.clientName}</td>
                  <td className="px-4 py-3.5 text-muted-foreground">{formatFrequency(r)}</td>
                  <td className="px-4 py-3.5 text-muted-foreground hidden sm:table-cell">{formatDate(r.nextRunDate)}</td>
                  <td className="px-4 py-3.5 text-muted-foreground hidden md:table-cell">{r.lastGeneratedAt ? formatDate(r.lastGeneratedAt) : '—'}</td>
                  <td className="px-4 py-3.5 text-center">
                    <Badge variant="outline" className={r.isActive ? 'bg-success/10 text-success border-success/20' : 'bg-muted text-muted-foreground'}>
                      {r.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5">
                    {canManage ? (
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="Edit">
                          <Link to={`/invoices/recurring/new?edit=${r.id}`}><Pencil className="h-4 w-4" /></Link>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Generate invoice now" onClick={() => handleGenerate(r)}>
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleActive(r.id, r.isActive)}>
                          {r.isActive ? <ToggleRight className="h-4 w-4 text-success" /> : <ToggleLeft className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={async () => { await deleteRecurring(r.id); toast.success('Deleted'); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">View only</span>
                    )}
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
  const { invoices, softDeleteInvoice, voidInvoice, fetchDeletedInvoices, loading, refetch: refetchInvoices } = useInvoices();
  const permissions = usePermissions();
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
      return matchesSearch && (inv.status === 'sent' || inv.status === 'partially_paid') && new Date(inv.dueDate) < new Date();
    }
    const matchesStatus = !statusFilter || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const showFrom = filtered.length > 0 ? page * PAGE_SIZE + 1 : 0;
  const showTo = Math.min((page + 1) * PAGE_SIZE, filtered.length);

  const statuses = ['draft', 'sent', 'paid', 'partially_paid', 'voided', 'overdue'];

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Invoices</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {companyFiltered.length} invoice{companyFiltered.length !== 1 ? 's' : ''} total
          </p>
        </div>
        {permissions.canCreateInvoice && (
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="gap-1.5 rounded-lg">
                  <Plus className="h-4 w-4" /> New <ChevronDown className="h-3 w-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild><Link to="/invoices/new">New Invoice</Link></DropdownMenuItem>
                {permissions.canManageRecurring && (
                  <DropdownMenuItem asChild><Link to="/invoices/recurring/new">New Recurring Invoice</Link></DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
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
        <RecurringTab refetchInvoices={refetchInvoices} canManage={permissions.canManageRecurring} />
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
                        const isOverdue = (inv.status === 'sent' || inv.status === 'partially_paid') && new Date(inv.dueDate) < new Date();
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
                              <span className={`mono font-medium ${inv.status === 'voided' ? 'line-through text-muted-foreground' : ''}`}>{formatCurrency((() => { const co = getCompany(inv.companyId); return calculateSmartTotals(inv.items, inv.taxRate, co?.pricingMode || 'exclusive', co?.isVatRegistered ?? false).total; })(), inv.currency)}</span>
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
                  {(inv.status === 'approved' || inv.status === 'sent' || inv.status === 'partially_paid') && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={async () => {
                                          const success = await voidInvoice(inv.id);
                                          if (success) toast.success('Invoice voided');
                                          else toast.error('Failed to void');
                                        }}
                                        className="text-destructive focus:text-destructive"
                                      >
                                        <Ban className="mr-2 h-4 w-4" /> Void
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  {inv.status === 'draft' && (
                                    <>
                                      <DropdownMenuSeparator />
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
                                    </>
                                  )}
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
                  const isOverdue = (inv.status === 'sent' || inv.status === 'partially_paid') && new Date(inv.dueDate) < new Date();
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
                        <span className={`mono text-sm font-medium ${inv.status === 'voided' ? 'line-through text-muted-foreground' : ''}`}>{formatCurrency((() => { const co = getCompany(inv.companyId); return calculateSmartTotals(inv.items, inv.taxRate, co?.pricingMode || 'exclusive', co?.isVatRegistered ?? false).total; })(), inv.currency)}</span>
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
