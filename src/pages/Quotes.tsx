import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileCheck, Plus, Trash2, MoreHorizontal, Search, ArrowRight, Edit } from 'lucide-react';
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
import { useQuotes } from '@/hooks/useQuotes';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useCompanies } from '@/hooks/useInvoiceStore';
import { formatCurrency, calculateSmartTotals } from '@/types/invoice';
import type { Currency, InvoiceItem } from '@/types/invoice';
import { toast } from 'sonner';

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  sent: { label: 'Sent', className: 'bg-warning/10 text-warning border-warning/20' },
  accepted: { label: 'Accepted', className: 'bg-success/10 text-success border-success/20' },
  declined: { label: 'Declined', className: 'bg-destructive/10 text-destructive border-destructive/20' },
};

export default function Quotes() {
  const navigate = useNavigate();
  const { quotes, addQuote, updateQuote, deleteQuote } = useQuotes();
  const { activeCompanyId } = useActiveCompany();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingQuote, setEditingQuote] = useState<typeof quotes[0] | null>(null);

  const filtered = quotes
    .filter(q => !activeCompanyId || q.companyId === activeCompanyId)
    .filter(q => !search || q.quoteNumber.toLowerCase().includes(search.toLowerCase()) || q.clientName.toLowerCase().includes(search.toLowerCase()));

  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [currency, setCurrency] = useState<Currency>('ZAR');
  const [taxRate, setTaxRate] = useState(15);
  const [notes, setNotes] = useState('');
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [items, setItems] = useState<InvoiceItem[]>([{ id: uuidv4(), description: '', quantity: 1, unitPrice: 0 }]);

  const resetForm = () => {
    setClientName(''); setClientEmail(''); setClientAddress('');
    setCurrency('ZAR'); setTaxRate(15); setNotes('');
    setItems([{ id: uuidv4(), description: '', quantity: 1, unitPrice: 0 }]);
    const d = new Date(); d.setDate(d.getDate() + 30);
    setValidUntil(d.toISOString().split('T')[0]);
    setEditingQuote(null);
  };

  const openEdit = (q: typeof quotes[0]) => {
    setEditingQuote(q);
    setClientName(q.clientName);
    setClientEmail(q.clientEmail);
    setClientAddress(q.clientAddress);
    setCurrency(q.currency);
    setTaxRate(q.taxRate);
    setNotes(q.notes);
    setValidUntil(q.validUntil);
    setItems(q.items.map(i => ({ ...i })));
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompanyId) { toast.error('Select a company first'); return; }
    if (!clientName) { toast.error('Enter client name'); return; }

    if (editingQuote) {
      await updateQuote({
        ...editingQuote,
        clientName, clientEmail, clientAddress,
        items, taxRate, currency, notes, validUntil,
      });
      toast.success(`Quote ${editingQuote.quoteNumber} updated`);
      resetForm(); setOpen(false);
    } else {
      const result = await addQuote({
        id: uuidv4(),
        companyId: activeCompanyId,
        clientName, clientEmail, clientAddress,
        items, taxRate, currency,
        status: 'draft',
        notes,
        validUntil,
      });
      if (result) {
        toast.success(`Quote ${result.quoteNumber} created`);
        resetForm(); setOpen(false);
      } else {
        toast.error('Failed to create quote');
      }
    }
  };

  const handleConvertToInvoice = (q: typeof quotes[0]) => {
    navigate('/invoices/new', {
      state: {
        clientName: q.clientName,
        clientEmail: q.clientEmail,
        clientAddress: q.clientAddress,
        currency: q.currency,
        items: q.items,
        taxRate: q.taxRate,
        notes: q.notes,
      },
    });
    updateQuote({ ...q, status: 'accepted' });
    toast.success('Converting quote to invoice');
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteQuote(deleteId);
    toast.success('Quote deleted');
    setDeleteId(null);
  };

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Quotes</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create and manage quotes for your customers.</p>
        </div>
        <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-1.5 rounded-lg"><Plus className="h-4 w-4" /> New Quote</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingQuote ? 'Edit Quote' : 'New Quote'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
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
              <div className="grid gap-3 sm:grid-cols-3">
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
                <div className="space-y-1.5">
                  <Label className="text-xs">Valid Until</Label>
                  <Input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} className="h-9" />
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
                <Button type="submit">{editingQuote ? 'Update Quote' : 'Create Quote'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {filtered.length > 0 && (
        <div className="mb-4">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search quotes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 rounded-lg" />
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-20">
          <FileCheck className="h-10 w-10 text-muted-foreground/30" />
          <h3 className="mt-4 text-lg font-medium">No quotes yet</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm text-center">
            Create quotes and convert them to invoices when accepted.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 bg-card invoice-shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/20">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Number</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Valid Until</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Amount</th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-4 py-3 w-12" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(q => {
                const co = activeCompany;
                const total = calculateSmartTotals(q.items, q.taxRate, co?.pricingMode || 'exclusive', co?.isVatRegistered ?? false).total;
                const cfg = statusConfig[q.status] || statusConfig.draft;
                return (
                  <tr key={q.id} className="border-b last:border-0 hover:bg-secondary/40 transition-colors">
                    <td className="px-4 py-3.5 mono font-medium">{q.quoteNumber}</td>
                    <td className="px-4 py-3.5">{q.clientName}</td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden sm:table-cell">{new Date(q.validUntil).toLocaleDateString()}</td>
                    <td className="px-4 py-3.5 text-right mono font-medium">{formatCurrency(total, q.currency)}</td>
                    <td className="px-4 py-3.5 text-center">
                      <Badge variant="outline" className={`${cfg.className} text-[11px]`}>{cfg.label}</Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {q.status === 'draft' && (
                            <DropdownMenuItem onClick={() => openEdit(q)}>
                              <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                          )}
                          {(q.status === 'draft' || q.status === 'sent') && (
                            <DropdownMenuItem onClick={() => handleConvertToInvoice(q)}>
                              <ArrowRight className="mr-2 h-4 w-4" /> Convert to Invoice
                            </DropdownMenuItem>
                          )}
                          {q.status === 'draft' && (
                            <DropdownMenuItem onClick={() => updateQuote({ ...q, status: 'sent' })}>
                              Mark as Sent
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setDeleteId(q.id)} className="text-destructive focus:text-destructive">
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
            <AlertDialogTitle>Delete quote?</AlertDialogTitle>
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
