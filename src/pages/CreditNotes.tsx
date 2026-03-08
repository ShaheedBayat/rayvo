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
import { useInvoices } from '@/hooks/useInvoiceStore';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { formatCurrency, calculateSmartTotals } from '@/types/invoice';
import type { Currency, InvoiceItem } from '@/types/invoice';
import { toast } from 'sonner';

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  approved: { label: 'Approved', className: 'bg-info/10 text-info border-info/20' },
  sent: { label: 'Sent', className: 'bg-warning/10 text-warning border-warning/20' },
};

export default function CreditNotes() {
  const { creditNotes, addCreditNote, updateCreditNote, deleteCreditNote } = useCreditNotes();
  const { invoices } = useInvoices();
  const { activeCompany, activeCompanyId } = useActiveCompany();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingCN, setEditingCN] = useState<typeof creditNotes[0] | null>(null);

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

  const companyInvoices = invoices.filter(i => i.companyId === activeCompanyId && i.status !== 'draft');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompanyId) { toast.error('Select a company first'); return; }
    if (!clientName) { toast.error('Enter client name'); return; }

    if (editingCN) {
      await updateCreditNote({
        ...editingCN,
        clientName, clientEmail, clientAddress,
        items, taxRate, currency, notes,
      });
      toast.success(`Credit note ${editingCN.creditNoteNumber} updated`);
      resetForm(); setOpen(false);
    } else {
      const d = new Date(); d.setDate(d.getDate() + 30);
      const result = await addCreditNote({
        id: uuidv4(),
        companyId: activeCompanyId,
        invoiceId: invoiceId || null,
        clientName, clientEmail, clientAddress,
        items, taxRate, currency,
        status: 'draft',
        notes,
        dueDate: d.toISOString().split('T')[0],
      });
      if (result) {
        toast.success(`Credit note ${result.creditNoteNumber} created`);
        resetForm(); setOpen(false);
      } else {
        toast.error('Failed to create credit note');
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteCreditNote(deleteId);
    toast.success('Credit note deleted');
    setDeleteId(null);
  };

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Credit Notes</h1>
          <p className="mt-1 text-sm text-muted-foreground">Issue credit notes against invoices.</p>
        </div>
        <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-1.5 rounded-lg"><Plus className="h-4 w-4" /> New Credit Note</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingCN ? 'Edit Credit Note' : 'New Credit Note'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              {!editingCN && companyInvoices.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Link to Invoice (optional)</Label>
                  <Select value={invoiceId} onValueChange={handleSelectInvoice}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select invoice..." /></SelectTrigger>
                    <SelectContent>
                      {companyInvoices.map(inv => (
                        <SelectItem key={inv.id} value={inv.id}>{inv.invoiceNumber} — {inv.clientName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                <Button type="submit">{editingCN ? 'Update Credit Note' : 'Create Credit Note'}</Button>
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
