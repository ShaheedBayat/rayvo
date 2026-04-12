import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useInvoices, useCompanies } from '@/hooks/useInvoiceStore';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useRecurringInvoices } from '@/hooks/useRecurringInvoices';
import { useActivityLog } from '@/hooks/useActivityLog';
import { formatCurrency, calculateSmartTotals } from '@/types/invoice';
import { formatDate } from '@/lib/formatDate';
import type { Currency } from '@/types/invoice';
import {
  FileText, Plus, MoreHorizontal, Trash2, Eye, Search, RefreshCw,
  ToggleLeft, ToggleRight, ChevronLeft, ChevronRight, Ban, Pencil,
  ArrowUpDown, ArrowUp, ArrowDown, Rows3, Rows2, Copy, ChevronDown,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from '@/components/ui/tooltip';
import AppLayout from '@/components/AppLayout';
import { toast } from 'sonner';

type SortKey = 'invoiceNumber' | 'clientName' | 'dueDate' | 'amount' | 'status';
type SortDir = 'asc' | 'desc';
type Density = 'compact' | 'comfortable';

const PAGE_SIZE = 20;

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  awaiting_approval: { label: 'Awaiting Approval', className: 'bg-warning/10 text-warning border-warning/20' },
  approved: { label: 'Approved', className: 'bg-info/10 text-info border-info/20' },
  sent: { label: 'Awaiting Payment', className: 'bg-warning/10 text-warning border-warning/20' },
  paid: { label: 'Paid', className: 'bg-success/10 text-success border-success/20' },
  overdue: { label: 'Overdue', className: 'bg-overdue/10 text-overdue border-overdue/20' },
  voided: { label: 'Voided', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  partially_paid: { label: 'Partially Paid', className: 'bg-info/10 text-info border-info/20' },
  credited: { label: 'Credited', className: 'bg-info/10 text-info border-info/20' },
};

function RecurringTab({ refetchInvoices, canManage }: { refetchInvoices: () => Promise<void>; canManage: boolean }) {
  const { recurring: allRecurring, updateRecurring, deleteRecurring, refetch: refetchRecurring } = useRecurringInvoices();
  const { companies } = useCompanies();
  const { activeCompanyId } = useActiveCompany();
  const { logActivity } = useActivityLog();
  const recurring = activeCompanyId ? allRecurring.filter(r => r.companyId === activeCompanyId) : allRecurring;

  const toggleActive = async (id: string, current: boolean) => {
    await updateRecurring(id, { isActive: !current });
    await logActivity('recurring', id, current ? 'paused' : 'activated', `Recurring template ${current ? 'paused' : 'activated'}`);
    await refetchRecurring();
    toast.success(!current ? 'Activated' : 'Paused');
  };

  const [generating, setGenerating] = useState<string | null>(null);

  const handleGenerate = async (r: typeof recurring[0]) => {
    setGenerating(r.id);
    try {
      const { data, error } = await supabase.functions.invoke('process-recurring-invoices', {
        body: { recurringId: r.id },
      });

      console.log('[RecurringGen] Edge function response:', JSON.stringify(data));

      if (error) {
        console.error('[RecurringGen] Edge function error:', error);
        toast.error('Invoice generation failed');
        return;
      }

      // Validate response
      if (!data?.created || data.created < 1 || !data?.createdInvoices?.length || !data.createdInvoices[0]?.id) {
        console.error('[RecurringGen] Invalid response — created:', data?.created, 'createdInvoices:', data?.createdInvoices);
        const reason = data?.skipped?.[0] || 'Invoice generation failed';
        toast.error(reason);
        return;
      }

      const newInvoiceId = data.createdInvoices[0].id;
      const newInvoiceNumber = data.createdInvoices[0].invoice_number;
      console.log('[RecurringGen] Invoice created — ID:', newInvoiceId, 'Number:', newInvoiceNumber);

      // Refetch both lists and wait for completion
      await Promise.all([refetchRecurring(), refetchInvoices()]);

      // Verify invoice exists in refetched list by querying DB directly
      const { data: verifyRow, error: verifyError } = await supabase
        .from('invoices')
        .select('id, invoice_number')
        .eq('id', newInvoiceId)
        .maybeSingle();

      console.log('[RecurringGen] Verification query result:', verifyRow, 'error:', verifyError);

      if (!verifyRow) {
        toast.error('Invoice created but not visible — refresh required');
        return;
      }

      await logActivity('recurring', r.id, 'generated', `Recurring invoice generated → ${verifyRow.invoice_number || newInvoiceNumber}`);
      toast.success(`Invoice ${verifyRow.invoice_number || newInvoiceNumber} generated from recurring template`);
    } catch (err) {
      console.error('[RecurringGen] Generate failed:', err);
      toast.error('Invoice generation failed');
    } finally {
      setGenerating(null);
    }
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
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Generate invoice now" onClick={() => handleGenerate(r)} disabled={generating === r.id}>
                          <RefreshCw className={`h-4 w-4 ${generating === r.id ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleActive(r.id, r.isActive)}>
                          {r.isActive ? <ToggleRight className="h-4 w-4 text-success" /> : <ToggleLeft className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={async () => {
                          const ok = await deleteRecurring(r.id);
                          if (ok) {
                            await logActivity('recurring', r.id, 'deleted', `Recurring template for ${r.clientName} deleted`);
                            await refetchRecurring();
                            toast.success('Recurring template deleted');
                          } else {
                            toast.error('Failed to delete recurring template');
                          }
                        }}>
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
  const { user } = useAuth();
  const { getCompany } = useCompanies();
  const { activeCompanyId } = useActiveCompany();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [deletedInvoices, setDeletedInvoices] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>('dueDate');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [density, setDensity] = useState<Density>('comfortable');
  const [selected, setSelected] = useState<Set<string>>(new Set());

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

  const companyFilteredRaw = activeCompanyId
    ? displayInvoices.filter(inv => inv.companyId === activeCompanyId)
    : displayInvoices;

  const companyFiltered = companyFilteredRaw;

  const getInvoiceTotal = (inv: typeof companyFiltered[0]) => {
    const co = getCompany(inv.companyId);
    return calculateSmartTotals(inv.items, inv.taxRate, co?.pricingMode || 'exclusive', co?.isVatRegistered ?? false).total;
  };

  const getEffectiveStatus = (inv: typeof companyFiltered[0]) => {
    if ((inv.status === 'sent' || inv.status === 'partially_paid') && new Date(inv.dueDate) < new Date()) return 'overdue';
    return inv.status;
  };

  const filtered = companyFiltered.filter((inv) => {
    const matchesSearch = !search || inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) || inv.clientName.toLowerCase().includes(search.toLowerCase());
    if (statusFilter === 'overdue') {
      return matchesSearch && (inv.status === 'sent' || inv.status === 'partially_paid') && new Date(inv.dueDate) < new Date();
    }
    const matchesStatus = !statusFilter || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Sorting
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'invoiceNumber': cmp = a.invoiceNumber.localeCompare(b.invoiceNumber); break;
        case 'clientName': cmp = a.clientName.localeCompare(b.clientName); break;
        case 'dueDate': cmp = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(); break;
        case 'amount': cmp = getInvoiceTotal(a) - getInvoiceTotal(b); break;
        case 'status': cmp = getEffectiveStatus(a).localeCompare(getEffectiveStatus(b)); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const showFrom = sorted.length > 0 ? page * PAGE_SIZE + 1 : 0;
  const showTo = Math.min((page + 1) * PAGE_SIZE, sorted.length);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-30" />;
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3 ml-1 text-primary" /> : <ArrowDown className="h-3 w-3 ml-1 text-primary" />;
  };

  // Bulk selection
  const allOnPageSelected = paginated.length > 0 && paginated.every(inv => selected.has(inv.id));
  const someOnPageSelected = paginated.some(inv => selected.has(inv.id));

  const toggleAll = () => {
    if (allOnPageSelected) {
      setSelected(prev => { const next = new Set(prev); paginated.forEach(inv => next.delete(inv.id)); return next; });
    } else {
      setSelected(prev => { const next = new Set(prev); paginated.forEach(inv => next.add(inv.id)); return next; });
    }
  };

  const toggleOne = (id: string) => {
    setSelected(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const handleBulkDelete = async () => {
    let count = 0;
    for (const id of selected) {
      const inv = companyFiltered.find(i => i.id === id);
      if (inv?.status === 'draft') {
        const result = await softDeleteInvoice(id);
        if (!result.error) count++;
      }
    }
    setSelected(new Set());
    if (count > 0) toast.success(`${count} invoice${count !== 1 ? 's' : ''} deleted`);
    else toast.info('No draft invoices to delete in selection');
  };

  const handleBulkVoid = async () => {
    let count = 0;
    for (const id of selected) {
      const inv = companyFiltered.find(i => i.id === id);
      if (inv && ['approved', 'sent', 'partially_paid'].includes(inv.status)) {
        const success = await voidInvoice(id);
        if (success) count++;
      }
    }
    setSelected(new Set());
    if (count > 0) toast.success(`${count} invoice${count !== 1 ? 's' : ''} voided`);
    else toast.info('No eligible invoices to void in selection');
  };

  const statuses = ['draft', 'awaiting_approval', 'sent', 'paid', 'partially_paid', 'voided', 'overdue'];

  const py = density === 'compact' ? 'py-2' : 'py-3.5';

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {companyFiltered.length} invoice{companyFiltered.length !== 1 ? 's' : ''} total
          </p>
        </div>
        {permissions.canCreateInvoice && (
          <Button className="gap-1.5 rounded-lg" asChild>
            <Link to="/invoices/new"><Plus className="h-4 w-4" /> New Invoice</Link>
          </Button>
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
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search invoices..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="pl-9 h-9 rounded-lg" />
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {/* Filter pills with horizontal scroll */}
              <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-0.5 min-w-0 flex-1">
                <button
                  onClick={() => { setShowDeleted(false); setStatusFilterParam(null); }}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${!statusFilter && !showDeleted ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
                >
                  All
                </button>
                {statuses.map((s) => (
                  <button key={s} onClick={() => { setShowDeleted(false); setStatusFilterParam(statusFilter === s ? null : s); }}
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${statusFilter === s ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
                  >
                    {statusConfig[s]?.label || s}
                  </button>
                ))}
                <button onClick={handleShowDeleted}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${showDeleted ? 'bg-destructive text-destructive-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
                >
                  Deleted
                </button>
              </div>
              {/* Density toggle */}
              <div className="hidden md:flex items-center border border-border/60 rounded-lg overflow-hidden shrink-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setDensity('compact')}
                      className={`p-1.5 transition-colors ${density === 'compact' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      <Rows2 className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Compact</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setDensity('comfortable')}
                      className={`p-1.5 transition-colors ${density === 'comfortable' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      <Rows3 className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Comfortable</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>

          {/* Bulk action bar */}
          {selected.size > 0 && (
            <div className="mb-3 flex items-center gap-3 rounded-lg bg-primary/5 border border-primary/20 px-4 py-2.5 animate-fade-in">
              <span className="text-sm font-medium">{selected.size} selected</span>
              <div className="flex items-center gap-1.5 ml-auto">
                {permissions.canDeleteInvoice && (
                  <Button variant="outline" size="sm" className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={handleBulkDelete}>
                    <Trash2 className="h-3.5 w-3.5" /> Delete drafts
                  </Button>
                )}
                {permissions.canVoidInvoice && (
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={handleBulkVoid}>
                    <Ban className="h-3.5 w-3.5" /> Void
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Clear</Button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 rounded-lg border bg-card p-4">
                  <Skeleton className="h-4 w-4 rounded" />
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
                      <tr className="border-b bg-muted/30">
                        <th className="px-3 py-2.5 w-10">
                          <Checkbox
                            checked={allOnPageSelected ? true : someOnPageSelected ? 'indeterminate' : false}
                            onCheckedChange={toggleAll}
                            aria-label="Select all"
                          />
                        </th>
                        <th className="px-4 py-2.5 text-left">
                          <button onClick={() => toggleSort('invoiceNumber')} className="inline-flex items-center text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
                            Invoice <SortIcon col="invoiceNumber" />
                          </button>
                        </th>
                        <th className="px-4 py-2.5 text-left">
                          <button onClick={() => toggleSort('clientName')} className="inline-flex items-center text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
                            Customer <SortIcon col="clientName" />
                          </button>
                        </th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Company</th>
                        <th className="px-4 py-2.5 text-left">
                          <button onClick={() => toggleSort('dueDate')} className="inline-flex items-center text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
                            Due Date <SortIcon col="dueDate" />
                          </button>
                        </th>
                        <th className="px-4 py-2.5 text-right">
                          <button onClick={() => toggleSort('amount')} className="inline-flex items-center text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors ml-auto">
                            Amount <SortIcon col="amount" />
                          </button>
                        </th>
                        <th className="px-4 py-2.5 text-center">
                          <button onClick={() => toggleSort('status')} className="inline-flex items-center text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
                            Status <SortIcon col="status" />
                          </button>
                        </th>
                        <th className="px-4 py-2.5 w-28" />
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((inv) => {
                        const company = getCompany(inv.companyId);
                        const isOverdue = (inv.status === 'sent' || inv.status === 'partially_paid') && new Date(inv.dueDate) < new Date();
                        const config = isOverdue ? statusConfig.overdue : (statusConfig[inv.status] || statusConfig.draft);
                        const isSelected = selected.has(inv.id);
                        return (
                          <tr key={inv.id} className={`group border-b last:border-0 transition-colors cursor-pointer ${isSelected ? 'bg-primary/5' : 'hover:bg-secondary/40'}`} onClick={(e) => { if ((e.target as HTMLElement).closest('a, button, input, [role="checkbox"]')) return; window.location.href = `/invoices/${inv.id}`; }}>
                            <td className={`px-3 ${py}`}>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleOne(inv.id)}
                                aria-label={`Select ${inv.invoiceNumber}`}
                              />
                            </td>
                            <td className={`px-4 ${py}`}>
                              <Link to={`/invoices/${inv.id}`} className="font-medium text-foreground hover:text-primary mono text-sm">{inv.invoiceNumber}</Link>
                              {density === 'comfortable' && (
                                <p className="text-xs text-muted-foreground mt-0.5">{formatDate(inv.createdAt)}</p>
                              )}
                            </td>
                            <td className={`px-4 ${py}`}>{inv.clientName}</td>
                            <td className={`px-4 ${py}`}>
                              <div className="flex items-center gap-2">
                                {company?.logo && <img src={company.logo} alt="" className="h-5 w-5 rounded object-contain" />}
                                <span className="text-muted-foreground">{company?.name || '—'}</span>
                              </div>
                            </td>
                            <td className={`px-4 ${py} text-muted-foreground`}>{formatDate(inv.dueDate)}</td>
                            <td className={`px-4 ${py} text-right`}>
                              <span className={`font-medium ${inv.status === 'voided' ? 'line-through text-muted-foreground' : ''}`}>
                                {formatCurrency(getInvoiceTotal(inv), inv.currency)}
                              </span>
                            </td>
                            <td className={`px-4 ${py} text-center`}>
                              <div className="flex items-center justify-center gap-1.5">
                                <Badge variant="outline" className={`${config.className} text-[11px] capitalize`}>
                                  {isOverdue ? 'Overdue' : config.label}
                                </Badge>
                                {(inv as any).invoiceType === 'deposit' && (
                                  <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 text-[10px]">Deposit</Badge>
                                )}
                                {(inv as any).invoiceType === 'balance' && (
                                  <Badge variant="outline" className="bg-info/10 text-info border-info/20 text-[10px]">Balance</Badge>
                                )}
                              </div>
                            </td>
                            <td className={`px-4 ${py}`}>
                              {/* Quick actions on hover + overflow menu */}
                              <div className="flex items-center justify-end gap-0.5">
                                <div className="hidden group-hover:flex items-center gap-0.5 animate-fade-in">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                                        <Link to={`/invoices/${inv.id}`}><Eye className="h-3.5 w-3.5" /></Link>
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>View</TooltipContent>
                                  </Tooltip>
                                  {inv.status === 'draft' && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                                          <Link to={`/invoices/${inv.id}/edit`}><Pencil className="h-3.5 w-3.5" /></Link>
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Edit</TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem asChild><Link to={`/invoices/${inv.id}`}><Eye className="mr-2 h-4 w-4" /> View</Link></DropdownMenuItem>
                                    {inv.status === 'draft' && (
                                      <DropdownMenuItem asChild><Link to={`/invoices/${inv.id}/edit`}><Pencil className="mr-2 h-4 w-4" /> Edit</Link></DropdownMenuItem>
                                    )}
                                    {permissions.canVoidInvoice && (inv.status === 'approved' || inv.status === 'sent' || inv.status === 'partially_paid') && (
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
                                    {permissions.canDeleteInvoice && inv.status === 'draft' && (
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
                              </div>
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
                        <span className={`text-sm font-medium ${inv.status === 'voided' ? 'line-through text-muted-foreground' : ''}`}>
                          {formatCurrency(getInvoiceTotal(inv), inv.currency)}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                  <span>Showing {showFrom}–{showTo} of {sorted.length}</span>
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
