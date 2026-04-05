import { useState } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { Users, Plus, Search, Building2, User, Trash2, Edit, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import AppLayout from '@/components/AppLayout';
import { useCustomers, type Customer } from '@/hooks/useCustomers';
import CustomerProfileForm from '@/components/customer/CustomerProfileForm';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const PAGE_SIZE = 20;

export default function Customers() {
  const { customers, loading, addCustomer, updateCustomer, deleteCustomer } = useCustomers();
  const permissions = usePermissions();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [page, setPage] = useState(0);
  const navigate = useNavigate();

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    c.accountNumber.toLowerCase().includes(search.toLowerCase()) ||
    c.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const showFrom = filtered.length > 0 ? page * PAGE_SIZE + 1 : 0;
  const showTo = Math.min((page + 1) * PAGE_SIZE, filtered.length);

  const handleSave = async (data: Omit<Customer, 'createdAt'>) => {
    const err = editing
      ? await updateCustomer(data)
      : await addCustomer(data);
    if (!err) {
      toast.success(editing ? 'Customer updated!' : 'Customer added!');
      setDialogOpen(false);
      setEditing(undefined);
    } else {
      toast.error('Failed to save customer');
    }
    return err;
  };

  const openNew = () => { setEditing(undefined); setDialogOpen(true); };
  const openEdit = (c: Customer) => { setEditing(c); setDialogOpen(true); };

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage customer profiles, contacts, and sales defaults.
          </p>
        </div>
        {permissions.canCreateCustomer && (
          <Button className="gap-1.5" onClick={openNew}>
            <Plus className="h-4 w-4" />
            New Customer
          </Button>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={v => { setDialogOpen(v); if (!v) setEditing(undefined); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle>{editing ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="px-6 pb-6 max-h-[calc(90vh-80px)]">
            <CustomerProfileForm
              initial={editing}
              onSave={handleSave}
              onCancel={() => { setDialogOpen(false); setEditing(undefined); }}
              onSaveAndCreateInvoice={() => navigate('/invoices/new')}
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 rounded-lg border bg-card p-4">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      ) : customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20">
          <Users className="h-10 w-10 text-muted-foreground/40" />
          <h3 className="mt-4 text-lg font-medium">No customers yet</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm text-center">
            Add your first customer to start managing contacts, invoice history, and outstanding balances.
          </p>
          <Button className="mt-6 gap-1.5" onClick={openNew}>
            <Plus className="h-4 w-4" />
            Add your first customer
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(0); }}
                placeholder="Search by name, email, account, tags..."
                className="pl-9 h-9"
              />
            </div>
          </div>

          {/* Desktop table */}
          <div className="rounded-lg border bg-card invoice-shadow overflow-hidden hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                   <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account #</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="py-3 px-4 w-24" />
                </tr>
              </thead>
              <tbody>
                {paginated.map(c => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => openEdit(c)}>
                    <td className="py-3 px-4 font-medium">
                      {c.name}
                      {c.tags.length > 0 && (
                        <span className="ml-2 inline-flex gap-1">
                          {c.tags.slice(0, 2).map(t => (
                            <Badge key={t} variant="outline" className="text-[10px] px-1.5 py-0">{t}</Badge>
                          ))}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="secondary" className="capitalize text-[11px]">
                        {c.type === 'individual' ? <User className="h-3 w-3 mr-1" /> : <Building2 className="h-3 w-3 mr-1" />}
                        {c.type}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{c.email || '—'}</td>
                    <td className="py-3 px-4 mono text-xs text-muted-foreground">{c.accountNumber || '—'}</td>
                    <td className="py-3 px-4">
                      <Badge variant={c.status === 'active' ? 'default' : 'outline'} className="text-[11px]">
                        {c.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 flex gap-1 justify-end" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/customers/${c.id}/statement`)} title="View Statement">
                        <FileText className="h-3.5 w-3.5" />
                      </Button>
                      {permissions.canEditCustomer && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {permissions.canDeleteCustomer && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteTarget(c)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-2 md:hidden">
            {paginated.map(c => (
              <div key={c.id} className="rounded-lg border bg-card p-4 invoice-shadow" onClick={() => openEdit(c)}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{c.name}</span>
                  <Badge variant={c.status === 'active' ? 'default' : 'outline'} className="text-[11px]">{c.status}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">{c.email || '—'}</div>
                <div className="flex items-center justify-between mt-2">
                  <Badge variant="secondary" className="capitalize text-[10px]">{c.type}</Badge>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}><Edit className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(c)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
              </div>
            ))}
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

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete customer?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteTarget?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deleteTarget) { deleteCustomer(deleteTarget.id); toast.success('Customer deleted'); setDeleteTarget(null); } }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
