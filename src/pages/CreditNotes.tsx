import { useState } from 'react';
import { Receipt, Plus, Trash2, MoreHorizontal, Search, Edit, CheckCircle, Send } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import AppLayout from '@/components/AppLayout';
import { useCreditNotes } from '@/hooks/useCreditNotes';
import { useInvoices, useCompanies } from '@/hooks/useInvoiceStore';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useActivityLog } from '@/hooks/useActivityLog';
import { formatCurrency, calculateSmartTotals } from '@/types/invoice';
import type { Currency, InvoiceItem } from '@/types/invoice';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { safeExecuteAction } from '@/lib/safeExecuteAction';

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  approved: { label: 'Approved', className: 'bg-info/10 text-info border-info/20' },
  sent: { label: 'Sent', className: 'bg-warning/10 text-warning border-warning/20' },
};

export default function CreditNotes() {
  const { creditNotes, addCreditNote, updateCreditNote, deleteCreditNote, refetch } = useCreditNotes();
  const { invoices, updateInvoice } = useInvoices();
  const { getCompany } = useCompanies();
  const { activeCompany, activeCompanyId } = useActiveCompany();
  const { logActivity } = useActivityLog();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingCN, setEditingCN] = useState<typeof creditNotes[0] | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = creditNotes
    .filter(cn => !activeCompanyId || cn.companyId === activeCompanyId)
    .filter(cn => !search || cn.creditNoteNumber.toLowerCase().includes(search.toLowerCase()) || cn.clientName.toLowerCase().includes(search.toLowerCase()));

  // Form state
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [currency, setCurrency] = useState<Currency>('ZAR');
  const [taxRate, setTaxRate] = useState(15);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([{ id: uuidv4(), description: '', quantity: 1, unitPrice: 0 }]);

  const companyInvoices = invoices.filter(i => i.companyId === activeCompanyId && i.status !== 'draft' && i.status !== 'voided');

  const resetForm = () => {
    setClientName(''); setClientEmail(''); setClientAddress('');
    setInvoiceId(''); setCurrency('ZAR'); setTaxRate(15); setNotes('');
    setItems([{ id: uuidv4(), description: '', quantity: 1, unitPrice: 0 }]);
    setEditingCN(null);
  };

  const handleSelectInvoice = (id: string) => {
    setInvoiceId(id);
    const inv = invoices.find(i => i.id === id);
    if (inv) {
      setClientName(inv.clientName);
      setClientEmail(inv.clientEmail);
      setClientAddress(inv.clientAddress);
      setCurrency(inv.currency);
      setTaxRate(inv.taxRate);
      setItems(inv.items.map(i => ({ ...i, id: uuidv4() })));
    }
  };

  const openEdit = (cn: typeof creditNotes[0]) => {
    setEditingCN(cn);
    setClientName(cn.clientName);
    setClientEmail(cn.clientEmail);
    setClientAddress(cn.clientAddress);
    setInvoiceId(cn.invoiceId || '');
    setCurrency(cn.currency);
    setTaxRate(cn.taxRate);
    setNotes(cn.notes);
    setItems(cn.items.map(i => ({ ...i })));
    setOpen(true);
  };

  /** Get the remaining creditable amount for the selected invoice */
  const getInvoiceOutstanding = (invId: string) => {
    const inv = invoices.find(i => i.id === invId);
    if (!inv) return 0;
    const co = getCompany(inv.companyId);
    const invoiceTotal = calculateSmartTotals(inv.items, inv.taxRate, co?.pricingMode || 'exclusive', co?.isVatRegistered ?? false).total;

    // Sum existing approved/sent credit notes for this invoice
    const existingCredits = creditNotes
      .filter(cn => cn.invoiceId === invId && cn.id !== editingCN?.id)
      .reduce((sum, cn) => {
        const cnCo = cn.companyId ? getCompany(cn.companyId) : undefined;
        return sum + calculateSmartTotals(cn.items, cn.taxRate, cnCo?.pricingMode || 'exclusive', cnCo?.isVatRegistered ?? false).total;
      }, 0);

    return Math.max(0, invoiceTotal - existingCredits);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!activeCompanyId) { toast.error('Select a company first'); return; }
    if (!clientName) { toast.error('Enter client name'); return; }
    if (!invoiceId) { toast.error('Select an invoice to credit'); return; }

    const co = activeCompany;
    const creditTotal = calculateSmartTotals(items, taxRate, co?.pricingMode || 'exclusive', co?.isVatRegistered ?? false).total;
    const outstanding = getInvoiceOutstanding(invoiceId);

    if (creditTotal > outstanding + 0.01) {
      toast.error(`Credit amount (${formatCurrency(creditTotal, currency)}) exceeds invoice outstanding (${formatCurrency(outstanding, currency)})`);
      return;
    }

    if (creditTotal <= 0) {
      toast.error('Credit note amount must be greater than zero');
      return;
    }

    setSaving(true);

    if (editingCN) {
      await safeExecuteAction({
        actionName: 'Update credit note',
        actionFn: async () => {
          await updateCreditNote({
            ...editingCN,
            clientName, clientEmail, clientAddress,
            items, taxRate, currency, notes,
          });
          return editingCN;
        },
        successMessage: `Credit note ${editingCN.creditNoteNumber} updated`,
        onSuccess: async () => {
          await logActivity('credit_note', editingCN.id, 'updated', `Credit note ${editingCN.creditNoteNumber} updated`);
          await refetch();
        },
      });
      resetForm(); setOpen(false);
      setSaving(false);
      return;
    }

    const cnId = uuidv4();
    const d = new Date(); d.setDate(d.getDate() + 30);

    const result = await safeExecuteAction({
      actionName: 'Create credit note',
      silentSuccess: true,
      actionFn: () => addCreditNote({
        id: cnId,
        companyId: activeCompanyId,
        invoiceId: invoiceId || null,
        clientName, clientEmail, clientAddress,
        items, taxRate, currency,
        status: 'approved',
        notes,
        dueDate: d.toISOString().split('T')[0],
      }),
      verifyFn: async () => {
        const { data } = await supabase.from('credit_notes').select('id').eq('id', cnId).maybeSingle();
        return !!data;
      },
    });

    if (result) {
      const linkedInvoice = invoices.find(i => i.id === invoiceId);

      // Log activity
      await logActivity(
        'credit_note', cnId, 'created',
        `Credit note ${result.creditNoteNumber} created for ${linkedInvoice?.invoiceNumber || 'N/A'} amount ${formatCurrency(creditTotal, currency)}`
      );

      // Update invoice status based on remaining balance
      if (linkedInvoice) {
        const invCo = getCompany(linkedInvoice.companyId);
        const invoiceTotal = calculateSmartTotals(linkedInvoice.items, linkedInvoice.taxRate, invCo?.pricingMode || 'exclusive', invCo?.isVatRegistered ?? false).total;

        // Get DB payments total
        const { data: dbPayments } = await supabase
          .from('payments')
          .select('amount')
          .eq('invoice_id', linkedInvoice.id);
        const totalPaid = (dbPayments || []).reduce((sum, p) => sum + Number(p.amount), 0);

        // Get all credit notes for this invoice (including the one just created)
        const { data: dbCreditNotes } = await supabase
          .from('credit_notes')
          .select('items, tax_rate')
          .eq('invoice_id', linkedInvoice.id)
          .is('deleted_at', null);

        const totalCredits = (dbCreditNotes || []).reduce((sum, cn) => {
          const cnItems = ((cn.items as unknown) as InvoiceItem[]) || [];
          return sum + calculateSmartTotals(cnItems, Number(cn.tax_rate), invCo?.pricingMode || 'exclusive', invCo?.isVatRegistered ?? false).total;
        }, 0);

        const remaining = invoiceTotal - totalPaid - totalCredits;

        let newStatus = linkedInvoice.status;
        if (remaining <= 0.01) {
          newStatus = 'credited';
        } else if (totalCredits > 0 || totalPaid > 0) {
          newStatus = 'partially_paid';
        }

        if (newStatus !== linkedInvoice.status) {
          await updateInvoice({ ...linkedInvoice, status: newStatus as any });
          await logActivity(
            'invoice', linkedInvoice.id, 'status_updated',
            `Invoice ${linkedInvoice.invoiceNumber} status changed to ${newStatus} after credit note ${result.creditNoteNumber}`
          );
        }
      }

      toast.success(`Credit note ${result.creditNoteNumber} created for ${linkedInvoice?.invoiceNumber || ''}`);
      resetForm(); setOpen(false);
      await refetch();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteCreditNote(deleteId);
    toast.success('Credit note deleted');
    setDeleteId(null);
  };

  // Compute selected invoice outstanding for display
  const selectedInvoiceOutstanding = invoiceId ? getInvoiceOutstanding(invoiceId) : null;
  const selectedInvoice = invoiceId ? invoices.find(i => i.id === invoiceId) : null;

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Credit Notes</h1>
          <p className="mt-1 text-sm text-muted-foreground">Issue credit notes against invoices to adjust balances.</p>
        </div>
        <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-1.5 rounded-lg"><Plus className="h-4 w-4" /> New Credit Note</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingCN ? 'Edit Credit Note' : 'New Credit Note'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              {!editingCN && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Link to Invoice <span className="text-destructive">*</span></Label>
                  <Select value={invoiceId} onValueChange={handleSelectInvoice}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select invoice..." /></SelectTrigger>
                    <SelectContent>
                      {companyInvoices.map(inv => (
                        <SelectItem key={inv.id} value={inv.id}>{inv.invoiceNumber} — {inv.clientName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {companyInvoices.length === 0 && (
                    <p className="text-xs text-muted-foreground">No eligible invoices found. Only non-draft, non-voided invoices can be credited.</p>
                  )}
                </div>
              )}

              {selectedInvoice && selectedInvoiceOutstanding !== null && (
                <div className="rounded-lg bg-muted/40 p-3 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Invoice</span>
                    <span className="mono font-medium">{selectedInvoice.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Available to credit</span>
                    <span className="mono font-semibold text-primary">{formatCurrency(selectedInvoiceOutstanding, currency)}</span>
                  </div>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Customer Name</Label>
                  <Input required value={clientName} onChange={e => setClientName(e.target.value)} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email</Label>
                  <Input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} className="h-9" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Address</Label>
                <Textarea value={clientAddress} onChange={e => setClientAddress(e.target.value)} rows={2} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Currency</Label>
                  <Select value={currency} onValueChange={v => setCurrency(v as Currency)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ZAR">ZAR</SelectItem><SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem><SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Tax Rate (%)</Label>
                  <Input type="number" min={0} max={100} value={taxRate} onChange={e => setTaxRate(parseFloat(e.target.value) || 0)} className="h-9" />
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
                <Label className="text-xs">Notes</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => { setOpen(false); resetForm(); }}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? 'Creating...' : editingCN ? 'Update Credit Note' : 'Create Credit Note'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {filtered.length > 0 && (
        <div className="mb-4">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search credit notes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 rounded-lg" />
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-20">
          <Receipt className="h-10 w-10 text-muted-foreground/30" />
          <h3 className="mt-4 text-lg font-medium">No credit notes yet</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm text-center">
            Create credit notes to issue refunds or adjustments against existing invoices.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 bg-card invoice-shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/20">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Number</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Invoice</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Date</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Amount</th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-4 py-3 w-12" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(cn => {
                const co = activeCompany;
                const total = calculateSmartTotals(cn.items, cn.taxRate, co?.pricingMode || 'exclusive', co?.isVatRegistered ?? false).total;
                const cfg = statusConfig[cn.status] || statusConfig.draft;
                const linkedInvoice = cn.invoiceId ? invoices.find(i => i.id === cn.invoiceId) : null;
                return (
                  <tr key={cn.id} className="border-b last:border-0 hover:bg-secondary/40 transition-colors">
                    <td className="px-4 py-3.5 mono font-medium">{cn.creditNoteNumber}</td>
                    <td className="px-4 py-3.5">{cn.clientName}</td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden sm:table-cell mono text-xs">{linkedInvoice?.invoiceNumber || '—'}</td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden sm:table-cell">{new Date(cn.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3.5 text-right mono font-medium">{formatCurrency(total, cn.currency)}</td>
                    <td className="px-4 py-3.5 text-center">
                      <Badge variant="outline" className={`${cfg.className} text-[11px]`}>{cfg.label}</Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {cn.status === 'draft' && (
                            <>
                              <DropdownMenuItem onClick={() => openEdit(cn)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { updateCreditNote({ ...cn, status: 'approved' }); toast.success('Marked as approved'); }}>
                                <CheckCircle className="mr-2 h-4 w-4" /> Mark as Approved
                              </DropdownMenuItem>
                            </>
                          )}
                          {(cn.status === 'draft' || cn.status === 'approved') && (
                            <DropdownMenuItem onClick={() => { updateCreditNote({ ...cn, status: 'sent' }); toast.success('Marked as sent'); }}>
                              <Send className="mr-2 h-4 w-4" /> Mark as Sent
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setDeleteId(cn.id)} className="text-destructive focus:text-destructive">
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
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete credit note?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
