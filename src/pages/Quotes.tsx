import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileCheck, Plus, Search } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import AppLayout from '@/components/AppLayout';
import { useQuotes } from '@/hooks/useQuotes';
import { useInvoices } from '@/hooks/useInvoiceStore';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useCompanies } from '@/hooks/useInvoiceStore';
import type { Currency } from '@/types/invoice';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { safeExecuteAction } from '@/lib/safeExecuteAction';
import { useActivityLog } from '@/hooks/useActivityLog';
import QuoteTable from '@/components/quote/QuoteTable';

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  sent: { label: 'Sent', className: 'bg-warning/10 text-warning border-warning/20' },
  accepted: { label: 'Accepted', className: 'bg-success/10 text-success border-success/20' },
  rejected: { label: 'Rejected', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  converted: { label: 'Converted', className: 'bg-primary/10 text-primary border-primary/20' },
};

export default function Quotes() {
  const navigate = useNavigate();
  const { quotes, updateQuote, deleteQuote, refetch } = useQuotes();
  const { addInvoice } = useInvoices();
  const { logActivity } = useActivityLog();
  const { activeCompanyId } = useActiveCompany();
  const { getCompany } = useCompanies();
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [converting, setConverting] = useState<string | null>(null);

  const filtered = quotes
    .filter(q => !activeCompanyId || q.companyId === activeCompanyId)
    .filter(q => !search || q.quoteNumber.toLowerCase().includes(search.toLowerCase()) || q.clientName.toLowerCase().includes(search.toLowerCase()));

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
        <Button className="gap-1.5 rounded-lg" onClick={() => navigate('/quotes/new')}>
          <Plus className="h-4 w-4" /> New Quote
        </Button>
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
          onEdit={(q) => navigate(`/quotes/${q.id}/edit`)}
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
