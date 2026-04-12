import { useParams, useNavigate, Link } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { useState, useEffect } from 'react';
import { useInvoices, useCompanies } from '@/hooks/useInvoiceStore';
import { useGlobalSettings } from '@/hooks/useGlobalSettings';
import { useVatLedger } from '@/hooks/useVatLedger';
import { useCreditNotes, type CreditNote } from '@/hooks/useCreditNotes';
import { usePayments } from '@/hooks/usePayments';
import { useActivityLog, type ActivityEntry } from '@/hooks/useActivityLog';
import { useAttachments } from '@/hooks/useAttachments';
import { formatCurrency, calculateSmartTotals } from '@/types/invoice';
import type { InvoiceItem } from '@/types/invoice';
import { formatDate } from '@/lib/formatDate';
import InvoiceDocument from '@/components/invoice/InvoiceDocument';
import FileUpload from '@/components/FileUpload';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Download, Share2, CheckCircle, Send, MoreHorizontal, Trash2, Copy, Edit, Ban, CreditCard, Clock, Activity, Paperclip, Mail, FileText, Image, Receipt } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { safeExecuteAction, safeDeleteAction } from '@/lib/safeExecuteAction';

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  approved: { label: 'Approved', className: 'bg-info/10 text-info border-info/20' },
  sent: { label: 'Awaiting Payment', className: 'bg-warning/10 text-warning border-warning/20' },
  paid: { label: 'Paid', className: 'bg-success/10 text-success border-success/20' },
  voided: { label: 'Voided', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  partially_paid: { label: 'Partially Paid', className: 'bg-warning/10 text-warning border-warning/20' },
  credited: { label: 'Credited', className: 'bg-info/10 text-info border-info/20' },
};

export default function InvoiceView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const permissions = usePermissions();
  const { getInvoice, updateInvoice, softDeleteInvoice, voidInvoice } = useInvoices();
  const { getCompany } = useCompanies();
  const { settings } = useGlobalSettings();
  const { payments, addPayment, deletePayment, totalPaid } = usePayments(id);
  const { createVatEntries, reverseVatEntries } = useVatLedger();
  const { creditNotes, addCreditNote, updateCreditNote, refetch: refetchCreditNotes } = useCreditNotes();
  const { logActivity, fetchLogs } = useActivityLog();
  const { attachments, uploadAttachment, deleteAttachment, getPublicUrl } = useAttachments('invoice', id || '');
  const docRef = useRef<HTMLDivElement>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [sendEmailOpen, setSendEmailOpen] = useState(false);
  const [activityLogs, setActivityLogs] = useState<ActivityEntry[]>([]);

  // Payment form state
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [payMethod, setPayMethod] = useState('bank_transfer');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  // Send email state
  const [emailAddresses, setEmailAddresses] = useState('');
  const [sending, setSending] = useState(false);

  const invoice = getInvoice(id || '');

  useEffect(() => {
    if (id) {
      fetchLogs('invoice', id).then(setActivityLogs);
    }
  }, [id, fetchLogs]);

  useEffect(() => {
    if (invoice?.clientEmail) setEmailAddresses(invoice.clientEmail);
  }, [invoice?.clientEmail]);

  if (!invoice) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Invoice not found.</p>
          <Link to="/invoices" className="text-primary hover:underline text-sm mt-2 inline-block">Back to invoices</Link>
        </div>
      </AppLayout>
    );
  }

  const company = getCompany(invoice.companyId);
  const config = statusConfig[invoice.status] || statusConfig.draft;
  const pricingMode = company?.pricingMode || 'exclusive';
  const isVatRegistered = company?.isVatRegistered ?? false;
  const smartTotals = calculateSmartTotals(invoice.items, invoice.taxRate, pricingMode, isVatRegistered);
  const total = smartTotals.total;
  const isPaid = invoice.status === 'paid';
  const isPartiallyPaid = invoice.status === 'partially_paid';
  const isSent = invoice.status === 'sent';
  const isVoided = invoice.status === 'voided';
  const isDraft = invoice.status === 'draft';
  // Paid & partially paid: no editing. Sent: allow edit only if no payments recorded.
  const canEdit = permissions.canEditInvoice(invoice.status) && ((invoice.status === 'draft' || invoice.status === 'approved') || (isSent && totalPaid === 0));
  const canVoid = permissions.canVoidInvoice && (invoice.status === 'approved' || isSent || isPartiallyPaid);
  const canRecordPayment = permissions.canRecordPayment && (isSent || isPartiallyPaid);
  const canDelete = permissions.canDeleteInvoice && isDraft;
  const isLocked = isPaid || invoice.status === 'credited';

  // Calculate total credits from credit notes linked to this invoice
  const invoiceCreditNotes = creditNotes.filter(cn => cn.invoiceId === invoice.id);
  const totalCredits = invoiceCreditNotes.reduce((sum, cn) => {
    const cnCo = cn.companyId ? getCompany(cn.companyId) : undefined;
    return sum + calculateSmartTotals(cn.items, cn.taxRate, cnCo?.pricingMode || 'exclusive', cnCo?.isVatRegistered ?? false).total;
  }, 0);

  const amountDue = total - totalPaid - totalCredits;

  const handleExportPdf = async () => {
    const element = document.getElementById('invoice-document');
    if (!element) return;
    const html2pdf = (await import('html2pdf.js')).default;
    html2pdf().set({ margin: 0.5, filename: `${invoice.invoiceNumber}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' } }).from(element).save();
    toast.success('PDF downloaded!');
  };

  const handleShare = () => {
    let token = invoice.shareToken;
    if (!token) {
      token = crypto.randomUUID();
      updateInvoice({ ...invoice, shareToken: token });
    }
    const url = `${window.location.origin}/public/invoice/${invoice.id}?token=${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Public link copied to clipboard!');
  };

  const handleSendEmail = async () => {
    const emails = emailAddresses.split(',').map(e => e.trim()).filter(Boolean);
    if (emails.length === 0) { toast.error('Enter at least one email address'); return; }

    setSending(true);
    // Ensure share token exists
    let token = invoice.shareToken;
    if (!token) {
      token = crypto.randomUUID();
      await updateInvoice({ ...invoice, shareToken: token });
    }
    const publicUrl = `${window.location.origin}/public/invoice/${invoice.id}?token=${token}`;

    const { error } = await supabase.functions.invoke('send-invoice-email', {
      body: {
        emails,
        invoiceNumber: invoice.invoiceNumber,
        clientName: invoice.clientName,
        amount: total.toFixed(2),
        currency: invoice.currency,
        dueDate: invoice.dueDate,
        publicUrl,
        companyName: company?.name || '',
      },
    });

    if (error) {
      toast.error('Failed to send email');
      console.error(error);
    } else {
      toast.success(`Invoice sent to ${emails.join(', ')}`);
      await logActivity('invoice', invoice.id, 'emailed', `Emailed to ${emails.join(', ')}`);
      fetchLogs('invoice', invoice.id).then(setActivityLogs);
    }
    setSending(false);
    setSendEmailOpen(false);
  };

  const markApproveAndSend = async () => {
    const result = await safeExecuteAction({
      actionName: 'Approve & send invoice',
      actionFn: () => updateInvoice({ ...invoice, status: 'sent' }),
      verifyFn: async (updated) => {
        const { data } = await supabase.from('invoices').select('id, status').eq('id', updated.id).maybeSingle();
        return data?.status === 'sent';
      },
      silentSuccess: true,
    });
    if (result) {
      await createVatEntries(invoice);
      await logActivity('invoice', invoice.id, 'approved_and_sent', `Invoice ${invoice.invoiceNumber} approved & sent`);
      toast.success('Invoice approved & sent');
      fetchLogs('invoice', invoice.id).then(setActivityLogs);
    }
  };

  const handleVoid = async () => {
    const success = await safeDeleteAction({
      actionName: 'Void invoice',
      actionFn: async () => {
        const ok = await voidInvoice(invoice.id);
        return ok ? { error: null } : { error: 'Failed to void invoice' };
      },
      verifyFn: async () => {
        const { data } = await supabase.from('invoices').select('id, status').eq('id', invoice.id).maybeSingle();
        return data?.status === 'voided';
      },
      successMessage: 'Invoice voided',
    });
    if (success) {
      await reverseVatEntries(invoice);
      await logActivity('invoice', invoice.id, 'voided', `Invoice ${invoice.invoiceNumber} voided`);
      fetchLogs('invoice', invoice.id).then(setActivityLogs);
    }
    setVoidOpen(false);
  };

  const handleDelete = async () => {
    await safeDeleteAction({
      actionName: 'Delete invoice',
      actionFn: () => softDeleteInvoice(invoice.id),
      verifyFn: async () => {
        const { data } = await supabase.from('invoices').select('id, deleted_at').eq('id', invoice.id).maybeSingle();
        return !!data?.deleted_at;
      },
      successMessage: 'Invoice moved to deleted',
      onSuccess: async () => {
        await logActivity('invoice', invoice.id, 'deleted', `Invoice ${invoice.invoiceNumber} deleted`);
        navigate('/invoices');
      },
    });
  };

  const handleDuplicate = () => {
    navigate('/invoices/new', {
      state: {
        clientName: invoice.clientName,
        clientEmail: invoice.clientEmail,
        clientAddress: invoice.clientAddress,
        currency: invoice.currency,
        items: invoice.items,
        taxRate: invoice.taxRate,
        notes: invoice.notes,
      },
    });
  };

  /** Compute correct invoice status from DB payment totals */
  const recalculateAndUpdateStatus = async (invoiceTotal: number, logContext?: { action: string; details: string }) => {
    // Refetch all payments from DB to get true total
    const { data: dbPayments, error: payErr } = await supabase
      .from('payments')
      .select('amount')
      .eq('invoice_id', invoice.id);
    if (payErr) {
      console.error('[Payment] Failed to refetch payments', payErr);
      toast.error('Failed to verify payment totals');
      return false;
    }
    const dbTotalPaid = (dbPayments || []).reduce((sum, p) => sum + Number(p.amount), 0);

    // Refetch credit notes from DB
    const { data: dbCreditNotes } = await supabase
      .from('credit_notes')
      .select('items, tax_rate')
      .eq('invoice_id', invoice.id)
      .is('deleted_at', null);
    const dbTotalCredits = (dbCreditNotes || []).reduce((sum, cn) => {
      const cnItems = ((cn.items as unknown) as InvoiceItem[]) || [];
      const cnCo = company;
      return sum + calculateSmartTotals(cnItems, Number(cn.tax_rate), cnCo?.pricingMode || 'exclusive', cnCo?.isVatRegistered ?? false).total;
    }, 0);

    const remaining = invoiceTotal - dbTotalPaid - dbTotalCredits;

    let newStatus: string;
    if (remaining <= 0.01 && dbTotalCredits > 0 && dbTotalPaid <= 0) {
      newStatus = 'credited';
    } else if (remaining <= 0.01) {
      newStatus = 'paid';
    } else if (dbTotalPaid > 0 || dbTotalCredits > 0) {
      newStatus = 'partially_paid';
    } else {
      newStatus = 'sent';
    }

    // Update invoice status
    const statusResult = await safeExecuteAction({
      actionName: 'Update invoice status',
      actionFn: () => updateInvoice({ ...invoice, status: newStatus as any }),
      verifyFn: async (updated) => {
        const { data } = await supabase.from('invoices').select('id, status').eq('id', updated.id).maybeSingle();
        return data?.status === newStatus;
      },
      silentSuccess: true,
    });

    if (!statusResult) {
      toast.error('Payment recorded but invoice status update failed — please refresh');
      return false;
    }

    if (logContext) {
      await logActivity('invoice', invoice.id, logContext.action, logContext.details);
    }
    return true;
  };


  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentProcessing) return;
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) { toast.error('Enter a valid amount'); return; }

    // Verify invoice exists in DB before recording
    const { data: dbInvoice } = await supabase.from('invoices').select('id, status').eq('id', invoice.id).maybeSingle();
    if (!dbInvoice) { toast.error('Invoice not found in database'); return; }
    if (dbInvoice.status === 'paid') { toast.error('Invoice is already fully paid'); return; }
    if (dbInvoice.status === 'voided') { toast.error('Cannot record payment on a voided invoice'); return; }
    if (dbInvoice.status === 'draft') { toast.error('Cannot record payment on a draft invoice'); return; }

    const overpaymentAmount = amount - amountDue;

    setPaymentProcessing(true);
    const result = await safeExecuteAction({
      actionName: 'Record payment',
      actionFn: () => addPayment({
        invoiceId: invoice.id,
        amount,
        paymentDate: payDate,
        method: payMethod,
        reference: payRef,
        notes: payNotes,
      }),
      verifyFn: async (payment) => {
        const { data } = await supabase.from('payments').select('id').eq('id', payment.id).maybeSingle();
        return !!data;
      },
      silentSuccess: true,
    });

    if (result) {
      // Auto-create credit note for overpayment
      if (overpaymentAmount > 0.01) {
        const { v4: uuidv4 } = await import('uuid');
        const cnId = uuidv4();
        const d = new Date(); d.setDate(d.getDate() + 30);
        const creditNote = await addCreditNote({
          id: cnId,
          companyId: invoice.companyId,
          invoiceId: invoice.id,
          clientName: invoice.clientName,
          clientEmail: invoice.clientEmail,
          clientAddress: invoice.clientAddress,
          items: [{ id: uuidv4(), description: `Overpayment on ${invoice.invoiceNumber}`, quantity: 1, unitPrice: overpaymentAmount }],
          taxRate: 0,
          currency: invoice.currency,
          status: 'available',
          notes: `Auto-generated from overpayment on invoice ${invoice.invoiceNumber}`,
          dueDate: d.toISOString().split('T')[0],
        });
        if (creditNote) {
          await logActivity('credit_note', cnId, 'created', `Credit note ${creditNote.creditNoteNumber} auto-created for overpayment of ${formatCurrency(overpaymentAmount, invoice.currency)} on ${invoice.invoiceNumber}`);
          toast.info(`Credit note ${creditNote.creditNoteNumber} created for overpayment of ${formatCurrency(overpaymentAmount, invoice.currency)}`);
        }
      }

      // Refetch payments & recalculate status from DB
      const statusOk = await recalculateAndUpdateStatus(total, {
        action: amount >= amountDue ? 'paid' : 'partial_payment',
        details: amount >= amountDue
          ? `Full payment received. Amount: ${formatCurrency(amount, invoice.currency)}`
          : `Payment of ${formatCurrency(amount, invoice.currency)} recorded.`,
      });

      if (statusOk) {
        toast.success(
          amount >= amountDue
            ? `Payment recorded. Invoice fully paid!`
            : `Payment recorded. Remaining balance: ${formatCurrency(amountDue - amount, invoice.currency)}`
        );
      }
      setPaymentOpen(false);
      setPayAmount(''); setPayRef(''); setPayNotes('');
      fetchLogs('invoice', invoice.id).then(setActivityLogs);
    }
    setPaymentProcessing(false);
  };

  return (
    <AppLayout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/invoices')} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Invoices
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold mono">{invoice.invoiceNumber}</h1>
            <Badge variant="outline" className={`${config.className} text-[11px]`}>{config.label}</Badge>
            {isLocked && (
              <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-[11px] gap-1">
                🔒 Finalized
              </Badge>
            )}
          </div>
        </div>

        {!isVoided && (
          <div className="flex items-center gap-2 flex-wrap">
            {canEdit && (
              <Button variant="outline" size="sm" onClick={() => navigate(`/invoices/${invoice.id}/edit`)}>
                <Edit className="mr-1.5 h-4 w-4" /> Edit
              </Button>
            )}
            {permissions.canSendInvoice && (invoice.status === 'draft' || invoice.status === 'approved') && (
              <Button variant="outline" size="sm" onClick={() => setSendConfirmOpen(true)} className="text-info border-info/30 hover:bg-info/10">
                <Send className="mr-1.5 h-4 w-4" /> Approve & Send
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setSendEmailOpen(true)}>
              <Mail className="mr-1.5 h-4 w-4" /> Email
            </Button>
            {canRecordPayment && (
              <Button variant="outline" size="sm" onClick={() => { setPayAmount(amountDue.toFixed(2)); setPaymentOpen(true); }} className="text-success border-success/30 hover:bg-success/10">
                <CreditCard className="mr-1.5 h-4 w-4" /> Record Payment
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="mr-1.5 h-4 w-4" /> Share
            </Button>
            <Button size="sm" onClick={handleExportPdf}>
              <Download className="mr-1.5 h-4 w-4" /> PDF
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleShare}>
                  <Copy className="mr-2 h-4 w-4" /> Copy share link
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDuplicate}>
                  <Copy className="mr-2 h-4 w-4" /> Duplicate invoice
                </DropdownMenuItem>
                {canVoid && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setVoidOpen(true)} className="text-destructive focus:text-destructive">
                      <Ban className="mr-2 h-4 w-4" /> Void invoice
                    </DropdownMenuItem>
                  </>
                )}
                {canDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setDeleteOpen(true)} className="text-destructive focus:text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" /> Delete invoice
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move {invoice.invoiceNumber} to deleted. This action can be reviewed by an admin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Void confirmation */}
      <AlertDialog open={voidOpen} onOpenChange={setVoidOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently void {invoice.invoiceNumber}. The invoice number will be preserved for your records but the invoice will be marked as void. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleVoid} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Void Invoice</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Send confirmation */}
      <AlertDialog open={sendConfirmOpen} onOpenChange={setSendConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send invoice to {invoice.clientName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will approve and mark {invoice.invoiceNumber} as sent ({formatCurrency(total, invoice.currency)}).
              {invoice.clientEmail ? ` An email notification can be sent to ${invoice.clientEmail}.` : ' No email is configured for this customer.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setSendConfirmOpen(false); markApproveAndSend(); }}>Approve & Send</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Send Email dialog */}
      <Dialog open={sendEmailOpen} onOpenChange={setSendEmailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Send Invoice via Email</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="rounded-lg bg-muted/40 p-3 text-sm">
              <p className="font-medium">{invoice.invoiceNumber}</p>
              <p className="text-muted-foreground">{formatCurrency(total, invoice.currency)} — Due {formatDate(invoice.dueDate)}</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email addresses (comma-separated)</Label>
              <Textarea
                value={emailAddresses}
                onChange={e => setEmailAddresses(e.target.value)}
                placeholder="client@example.com, accounts@example.com"
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSendEmailOpen(false)}>Cancel</Button>
              <Button onClick={handleSendEmail} disabled={sending}>
                <Mail className="mr-1.5 h-4 w-4" /> {sending ? 'Sending...' : 'Send Invoice'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Record Payment dialog */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          <form onSubmit={handleRecordPayment} className="space-y-4 mt-2">
            <div className="rounded-lg bg-muted/40 p-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Invoice Total</span><span className="mono font-medium">{formatCurrency(total, invoice.currency)}</span></div>
              <div className="flex justify-between mt-1"><span className="text-muted-foreground">Already Paid</span><span className="mono font-medium text-success">{formatCurrency(totalPaid, invoice.currency)}</span></div>
              <div className="flex justify-between mt-1 border-t pt-1"><span className="font-medium">Amount Due</span><span className="mono font-semibold text-primary">{formatCurrency(amountDue, invoice.currency)}</span></div>
              {payAmount && parseFloat(payAmount) > 0 && (
                <div className="flex justify-between mt-1 border-t pt-1">
                  <span className="text-muted-foreground">Remaining after payment</span>
                  <span className={`mono font-medium ${amountDue - parseFloat(payAmount) < 0 ? 'text-destructive' : 'text-success'}`}>
                    {formatCurrency(Math.max(0, amountDue - parseFloat(payAmount)), invoice.currency)}
                  </span>
                </div>
              )}
              {payAmount && parseFloat(payAmount) > amountDue && (
                <div className="mt-2 text-xs text-warning font-medium bg-warning/10 rounded px-2 py-1">
                  ⚠️ Overpayment will create credit of {formatCurrency(parseFloat(payAmount) - amountDue, invoice.currency)}
                </div>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Amount</Label>
                <Input type="number" step="0.01" min="0.01" required value={payAmount} onChange={e => setPayAmount(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Payment Date</Label>
                <Input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} className="h-9" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Method</Label>
                <Select value={payMethod} onValueChange={setPayMethod}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Reference</Label>
                <Input value={payRef} onChange={e => setPayRef(e.target.value)} className="h-9" placeholder="e.g. TXN-123" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea value={payNotes} onChange={e => setPayNotes(e.target.value)} rows={2} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setPaymentOpen(false)} disabled={paymentProcessing}>Cancel</Button>
              <Button type="submit" disabled={paymentProcessing}>
                {paymentProcessing ? 'Processing...' : 'Record Payment'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Financial Summary Banner */}
      {(() => {
        const isOverdue = !isVoided && invoice.status !== 'paid' && new Date(invoice.dueDate) < new Date();
        const isPaid = invoice.status === 'paid';
        const isPartial = invoice.status === 'partially_paid';

        let statusBannerClass = 'border-border';
        let statusLabel = '';
        let statusIcon = null as React.ReactNode;
        if (isVoided) {
          statusBannerClass = 'border-destructive/30 bg-destructive/5';
          statusLabel = 'Voided';
        } else if (isPaid) {
          statusBannerClass = 'border-success/30 bg-success/5';
          statusLabel = 'Paid in Full';
          statusIcon = <CheckCircle className="h-5 w-5 text-success" />;
        } else if (isOverdue) {
          statusBannerClass = 'border-destructive/30 bg-destructive/5';
          statusLabel = 'Overdue';
          statusIcon = <Clock className="h-5 w-5 text-destructive" />;
        } else if (isPartial) {
          statusBannerClass = 'border-warning/30 bg-warning/5';
          statusLabel = 'Partially Paid';
          statusIcon = <CreditCard className="h-5 w-5 text-warning" />;
        }

        return (
          <>
            {/* Status banner for paid/overdue/partial */}
            {statusLabel && !isDraft && invoice.status !== 'sent' && (
              <div className={`mb-4 rounded-lg border-2 ${statusBannerClass} p-3 flex items-center gap-3`}>
                {statusIcon}
                <span className={`font-semibold text-sm ${
                  isPaid ? 'text-success' : isOverdue ? 'text-destructive' : 'text-warning'
                }`}>
                  {statusLabel}
                  {isOverdue && ` — ${Math.ceil((Date.now() - new Date(invoice.dueDate).getTime()) / 86400000)} days past due`}
                </span>
              </div>
            )}

            <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-lg border bg-card p-4 invoice-shadow">
                <p className="text-xs text-muted-foreground mb-1">Customer</p>
                <p className="text-sm font-medium truncate">{invoice.clientName}</p>
              </div>
              <div className="rounded-lg border bg-card p-4 invoice-shadow">
                <p className="text-xs text-muted-foreground mb-1">Issue Date</p>
                <p className="text-sm font-medium">{formatDate(invoice.createdAt)}</p>
              </div>
              <div className="rounded-lg border bg-card p-4 invoice-shadow">
                <p className="text-xs text-muted-foreground mb-1">Due Date</p>
                <p className={`text-sm font-medium ${isOverdue ? 'text-destructive font-semibold' : ''}`}>{formatDate(invoice.dueDate)}</p>
              </div>
              <div className="rounded-lg border bg-card p-4 invoice-shadow">
                <p className="text-xs text-muted-foreground mb-1">{isVoided ? 'Amount (Voided)' : 'Amount Due'}</p>
                <p className={`text-sm font-semibold mono ${
                  isVoided ? 'text-destructive line-through' : isPaid ? 'text-success' : isOverdue ? 'text-destructive' : 'text-primary'
                }`}>
                  {formatCurrency(isVoided ? total : amountDue, invoice.currency)}
                </p>
              </div>
            </div>

            {/* Detailed financial breakdown */}
            <div className="mb-6 max-w-[800px] mx-auto rounded-lg border bg-card p-5 invoice-shadow">
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Financial Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal (excl. VAT)</span>
                  <span className="mono font-medium">{formatCurrency(smartTotals.subtotal, invoice.currency)}</span>
                </div>
                {isVatRegistered && smartTotals.tax > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">VAT ({invoice.taxRate}%)</span>
                    <span className="mono font-medium">{formatCurrency(smartTotals.tax, invoice.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2">
                  <span className="font-medium">{isVatRegistered ? 'Total incl. VAT' : 'Total'}</span>
                  <span className="mono font-semibold">{formatCurrency(total, invoice.currency)}</span>
                </div>
                {totalPaid > 0 && (
                  <div className="flex justify-between">
                    <span className="text-success font-medium">Total Paid</span>
                    <span className="mono font-medium text-success">− {formatCurrency(totalPaid, invoice.currency)}</span>
                  </div>
                )}
                {totalCredits > 0 && (
                  <div className="flex justify-between">
                    <span className="text-info font-medium">Credit Notes</span>
                    <span className="mono font-medium text-info">− {formatCurrency(totalCredits, invoice.currency)}</span>
                  </div>
                )}
                <div className={`flex justify-between border-t pt-2 ${
                  isPaid ? 'text-success' : isOverdue ? 'text-destructive' : isPartial ? 'text-warning' : ''
                }`}>
                  <span className="font-semibold">Remaining Balance</span>
                  <span className="mono font-bold text-lg">{formatCurrency(Math.max(0, amountDue), invoice.currency)}</span>
                </div>
              </div>
            </div>
          </>
        );
      })()}

      <div ref={docRef}>
        <InvoiceDocument invoice={invoice} company={company} bankingDetails={settings?.bankingDetails} termsConditions={settings?.termsConditions} />
      </div>

      {/* Attachments */}
      <div className="mt-8 max-w-[800px] mx-auto">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Paperclip className="h-4 w-4" /> Attachments
        </h2>
        {attachments.length > 0 && (
          <div className="space-y-2 mb-4">
            {attachments.map(a => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border px-4 py-2.5">
                <div className="flex items-center gap-2">
                  {a.mimeType.startsWith('image/') ? <Image className="h-4 w-4 text-muted-foreground" /> : <FileText className="h-4 w-4 text-muted-foreground" />}
                  <a href={getPublicUrl(a.filePath)} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline">{a.fileName}</a>
                  <span className="text-xs text-muted-foreground">({(a.fileSize / 1024).toFixed(0)} KB)</span>
                </div>
                {!isVoided && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteAttachment(a)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
        {!isVoided && <FileUpload onUpload={uploadAttachment} />}
      </div>

      {/* Credit Notes */}
      {invoiceCreditNotes.length > 0 && (
        <div className="mt-8 max-w-[800px] mx-auto">
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Receipt className="h-4 w-4" /> Credit Notes
          </h2>
          <div className="rounded-lg border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/20">
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Number</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Date</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoiceCreditNotes.map(cn => {
                  const cnCo = cn.companyId ? getCompany(cn.companyId) : undefined;
                  const cnTotal = calculateSmartTotals(cn.items, cn.taxRate, cnCo?.pricingMode || 'exclusive', cnCo?.isVatRegistered ?? false).total;
                  return (
                    <tr key={cn.id} className="border-b last:border-0">
                      <td className="px-4 py-2.5 mono font-medium">{cn.creditNoteNumber}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{formatDate(cn.createdAt)}</td>
                      <td className="px-4 py-2.5 capitalize text-muted-foreground">{cn.status}</td>
                      <td className="px-4 py-2.5 text-right mono font-medium text-info">− {formatCurrency(cnTotal, cn.currency)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment History */}
      {payments.length > 0 && (
        <div className="mt-8 max-w-[800px] mx-auto">
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> Payment History
          </h2>
          <div className="rounded-lg border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/20">
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Date</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Method</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Reference</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Amount</th>
                  <th className="px-4 py-2.5 w-10" />
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="px-4 py-2.5">{formatDate(p.paymentDate)}</td>
                    <td className="px-4 py-2.5 capitalize text-muted-foreground">{p.method.replace('_', ' ')}</td>
                    <td className="px-4 py-2.5 mono text-xs text-muted-foreground">{p.reference || '—'}</td>
                    <td className="px-4 py-2.5 text-right mono font-medium text-success">{formatCurrency(p.amount, invoice.currency)}</td>
                    <td className="px-4 py-2.5">
                      {!isVoided && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={async () => {
                          // Verify payment exists before deleting
                          const { data: existsCheck } = await supabase.from('payments').select('id').eq('id', p.id).maybeSingle();
                          if (!existsCheck) { toast.error('Payment not found'); return; }

                          await deletePayment(p.id);

                          // Verify deletion
                          const { data: stillExists } = await supabase.from('payments').select('id').eq('id', p.id).maybeSingle();
                          if (stillExists) { toast.error('Payment deletion failed — please refresh'); return; }

                          // Recalculate status from DB
                          const statusOk = await recalculateAndUpdateStatus(total, {
                            action: 'payment_removed',
                            details: `Payment of ${formatCurrency(p.amount, invoice.currency)} removed.`,
                          });
                          if (statusOk) {
                            toast.success('Payment removed');
                          }
                          fetchLogs('invoice', invoice.id).then(setActivityLogs);
                        }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Activity Log */}
      {activityLogs.length > 0 && (
        <div className="mt-8 max-w-[800px] mx-auto">
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4" /> Activity
          </h2>
          <div className="space-y-2">
            {activityLogs.map(log => (
              <div key={log.id} className="flex items-start gap-3 text-sm">
                <div className="mt-1.5 h-2 w-2 rounded-full bg-primary/40 shrink-0" />
                <div>
                  <span className="text-muted-foreground">{formatDate(log.createdAt)}</span>
                  <span className="mx-2">·</span>
                  <span className="capitalize font-medium">{log.action.replace(/_/g, ' ')}</span>
                  {log.details && <p className="text-xs text-muted-foreground mt-0.5">{log.details}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
