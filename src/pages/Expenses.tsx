import { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { useExpenses, EXPENSE_CATEGORIES, type Expense } from '@/hooks/useExpenses';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useActivityLog } from '@/hooks/useActivityLog';
import { safeExecuteAction } from '@/lib/safeExecuteAction';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Receipt, Loader2 } from 'lucide-react';
import { formatDate } from '@/lib/formatDate';
import { formatCurrency } from '@/types/invoice';
import type { Currency } from '@/types/invoice';

export default function Expenses() {
  const { expenses, loading, addExpense, updateExpense, deleteExpense, refetch } = useExpenses();
  const { activeCompanyId } = useActiveCompany();
  const { logActivity } = useActivityLog();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('Other');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [vendor, setVendor] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [includeVat, setIncludeVat] = useState(false);

  const resetForm = () => {
    setDate(new Date().toISOString().split('T')[0]);
    setCategory('Other');
    setDescription('');
    setAmount('');
    setVendor('');
    setReference('');
    setNotes('');
    setIncludeVat(false);
    setEditing(null);
  };

  const openNew = () => { resetForm(); setDialogOpen(true); };
  const openEdit = (e: Expense) => {
    setEditing(e);
    setDate(e.date);
    setCategory(e.category);
    setDescription(e.description);
    setAmount(String(e.amount));
    setVendor(e.vendor);
    setReference(e.reference);
    setNotes(e.notes);
    setDialogOpen(true);
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSubmitting(true);
    const parsedAmount = parseFloat(amount) || 0;
    const data = {
      date, category, description, amount: parsedAmount,
      currency: 'ZAR', vendor, reference, notes, companyId: activeCompanyId || null,
    };

    if (editing) {
      await safeExecuteAction({
        actionName: 'Update expense',
        actionFn: () => updateExpense({ ...editing, ...data }),
        successMessage: `Expense updated — ${formatCurrency(parsedAmount, 'ZAR')}`,
        onSuccess: async () => {
          await logActivity('expense', editing.id, 'updated', `Expense updated: ${description} ${formatCurrency(parsedAmount, 'ZAR')}`);
          await refetch();
        },
      });
    } else {
      await safeExecuteAction({
        actionName: 'Add expense',
        actionFn: () => addExpense(data),
        successMessage: `Expense added — ${formatCurrency(parsedAmount, 'ZAR')}`,
        onSuccess: async (result) => {
          await logActivity('expense', result.id, 'created', `Expense created: ${description} ${formatCurrency(parsedAmount, 'ZAR')}`);
          await refetch();
        },
      });
    }
    setSubmitting(false);
    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const expense = expenses.find(e => e.id === deleteId);
    const ok = await deleteExpense(deleteId);
    if (ok) {
      if (expense) {
        await logActivity('expense', deleteId, 'deleted', `Expense deleted: ${expense.description} ${formatCurrency(expense.amount, (expense.currency || 'ZAR') as Currency)}`);
      }
      await refetch();
    }
    setDeleting(false);
    setDeleteId(null);
  };

  const filtered = filterCategory === 'all' ? expenses : expenses.filter(e => e.category === filterCategory);
  const totalExpenses = filtered.reduce((sum, e) => sum + e.amount, 0);

  return (
    <AppLayout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Expenses</h1>
          <p className="mt-1 text-sm text-muted-foreground">Track business expenses and costs.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total Expenses</p>
            <p className="text-lg font-semibold mono text-destructive">
              {formatCurrency(totalExpenses, (filtered[0]?.currency || 'ZAR') as Currency)}
            </p>
          </div>
          <Button onClick={openNew}><Plus className="mr-1.5 h-4 w-4" /> Add Expense</Button>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-48 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm py-12 text-center">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Receipt className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">No expenses recorded yet.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={openNew}>Add your first expense</Button>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/20">
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Date</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Category</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Description</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Vendor</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Amount</th>
                <th className="px-4 py-2.5 w-20" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.id} className="border-b last:border-0 hover:bg-muted/10">
                  <td className="px-4 py-2.5">{formatDate(e.date)}</td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">{e.category}</span>
                  </td>
                  <td className="px-4 py-2.5 max-w-[200px] truncate">{e.description || '—'}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{e.vendor || '—'}</td>
                  <td className="px-4 py-2.5 text-right mono font-medium">{formatCurrency(e.amount, (e.currency || 'ZAR') as Currency)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(e)}><Pencil className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(e.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Edit Expense' : 'Add Expense'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Date</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-9" required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} className="h-9" required />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Amount</Label>
                <Input type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} className="h-9" required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Vendor</Label>
                <Input value={vendor} onChange={e => setVendor(e.target.value)} className="h-9" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={includeVat} onCheckedChange={setIncludeVat} id="include-vat" />
              <Label htmlFor="include-vat" className="text-xs text-muted-foreground">Amount includes VAT</Label>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Reference</Label>
              <Input value={reference} onChange={e => setReference(e.target.value)} className="h-9" placeholder="e.g. receipt number" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                {editing ? 'Update' : 'Add'} Expense
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete expense?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
