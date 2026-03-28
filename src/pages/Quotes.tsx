import { useState } from 'react';
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
import { useInvoices } from '@/hooks/useInvoiceStore';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useCompanies } from '@/hooks/useInvoiceStore';
import { formatCurrency, calculateSmartTotals } from '@/types/invoice';
import type { Currency, InvoiceItem } from '@/types/invoice';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { safeExecuteAction } from '@/lib/safeExecuteAction';
import { useActivityLog } from '@/hooks/useActivityLog';
import QuoteForm from '@/components/quote/QuoteForm';
import QuoteTable from '@/components/quote/QuoteTable';

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  sent: { label: 'Sent', className: 'bg-warning/10 text-warning border-warning/20' },
  accepted: { label: 'Accepted', className: 'bg-success/10 text-success border-success/20' },
  rejected: { label: 'Rejected', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  converted: { label: 'Converted', className: 'bg-primary/10 text-primary border-primary/20' },
};

export default function Quotes() {
  const { quotes, addQuote, updateQuote, deleteQuote, refetch } = useQuotes();
  const { addInvoice } = useInvoices();
  const { logActivity } = useActivityLog();
  const { activeCompanyId } = useActiveCompany();
  const { getCompany } = useCompanies();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingQuote, setEditingQuote] = useState<typeof quotes[0] | null>(null);
  const [converting, setConverting] = useState<string | null>(null);

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

  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!activeCompanyId) { toast.error('Select a company first'); return; }
    if (!clientName) { toast.error('Enter client name'); return; }

    setSaving(true);
    if (editingQuote) {
      await safeExecuteAction({
        actionName: 'Update quote',
        actionFn: async () => {
          await updateQuote({
            ...editingQuote,
            clientName, clientEmail, clientAddress,
            items, taxRate, currency, notes, validUntil,
          });
          return editingQuote;
        },
        successMessage: `Quote ${editingQuote.quoteNumber} updated`,
        onSuccess: async () => {
          await logActivity('quote', editingQuote.id, 'updated', `Quote ${editingQuote.quoteNumber} updated`);
          await refetch();
        },
      });
      resetForm(); setOpen(false);
    } else {
      const quoteId = uuidv4();
      await safeExecuteAction({
        actionName: 'Create quote',
        actionFn: () => addQuote({
          id: quoteId,
          companyId: activeCompanyId,
          clientName, clientEmail, clientAddress,
          items, taxRate, currency,
          status: 'draft',
          notes,
          validUntil,
        }),
        verifyFn: async () => {
          const { data } = await supabase.from('quotes').select('id').eq('id', quoteId).maybeSingle();
          return !!data;
        },
        silentSuccess: true,
        onSuccess: async (result) => {
          await logActivity('quote', result.id, 'created', `Quote ${result.quoteNumber} created`);
          await refetch();
          toast.success(`Quote ${result.quoteNumber} created successfully`);
        },
      });
      resetForm(); setOpen(false);
    }
    setSaving(false);
  };

  const handleConvertToInvoice = async (q: typeof quotes[0]) => {
    if (converting) return;
    setConverting(q.id);
    try {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      const invoiceId = uuidv4();

      await safeExecuteAction({
        actionName: 'Convert quote to invoice',
        silentSuccess: true,
        actionFn: async () => {
          return await addInvoice({
            id: invoiceId,
            invoiceNumber: 'TEMP',
            companyId: q.companyId,
            clientName: q.clientName,
            clientEmail: q.clientEmail,
            clientAddress: q.clientAddress,
            currency: q.currency,
            items: q.items.map(i => ({ ...i })),
            taxRate: q.taxRate,
            notes: q.notes,
            status: 'draft',
            createdAt: new Date().toISOString(),
            dueDate: dueDate.toISOString().split('T')[0],
          });
        },
        verifyFn: async () => {
          const { data } = await supabase
            .from('invoices')
            .select('id')
            .eq('id', invoiceId)
            .maybeSingle();
          return !!data;
        },
        onSuccess: async (created: any) => {
          await updateQuote({ ...q, status: 'converted' });
          await logActivity('quote', q.id, 'converted', `Quote ${q.quoteNumber} converted to Invoice ${created?.invoiceNumber || ''}`);
          await logActivity('invoice', invoiceId, 'created', `Invoice ${created?.invoiceNumber || ''} created from Quote ${q.quoteNumber}`);
          await refetch();
          toast.success(`Quote ${q.quoteNumber} converted to Invoice ${created?.invoiceNumber || ''}`);
        },
      });
    } catch {
      toast.error('Failed to convert quote to invoice');
    } finally {
      setConverting(null);
    }
  };

  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const q = quotes.find(q => q.id === deleteId);
    const ok = await deleteQuote(deleteId);
    if (ok !== undefined) {
      await logActivity('quote', deleteId, 'deleted', `Quote ${q?.quoteNumber || ''} deleted`);
      await refetch();
      toast.success(`Quote ${q?.quoteNumber || ''} deleted`);
    } else {
      toast.error('Failed to delete quote');
    }
    setDeleting(false);
    setDeleteId(null);
  };

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Quotes</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create quotes and convert them to invoices.</p>
        </div>
        <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-1.5 rounded-lg"><Plus className="h-4 w-4" /> New Quote</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingQuote ? 'Edit Quote' : 'New Quote'}</DialogTitle></DialogHeader>
            <QuoteForm
              editing={!!editingQuote}
              clientName={clientName} setClientName={setClientName}
              clientEmail={clientEmail} setClientEmail={setClientEmail}
              clientAddress={clientAddress} setClientAddress={setClientAddress}
              currency={currency} setCurrency={setCurrency}
              taxRate={taxRate} setTaxRate={setTaxRate}
              notes={notes} setNotes={setNotes}
              validUntil={validUntil} setValidUntil={setValidUntil}
              items={items} setItems={setItems}
              onSubmit={handleSubmit}
              onCancel={() => { setOpen(false); resetForm(); }}
            />
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
        <QuoteTable
          quotes={filtered}
          statusConfig={statusConfig}
          getCompany={getCompany}
          converting={converting}
          onEdit={openEdit}
          onConvert={handleConvertToInvoice}
          onUpdateStatus={async (q, status) => {
            await updateQuote({ ...q, status });
            await logActivity('quote', q.id, 'status_updated', `Quote ${q.quoteNumber} status changed to ${status}`);
            await refetch();
            toast.success(`Quote ${q.quoteNumber} marked as ${status}`);
          }}
          onDelete={setDeleteId}
        />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete quote?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{deleting ? 'Deleting...' : 'Delete'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
