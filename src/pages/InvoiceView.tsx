import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useInvoices, useCompanies } from '@/hooks/useInvoiceStore';
import { useGlobalSettings } from '@/hooks/useGlobalSettings';
import { useVatLedger } from '@/hooks/useVatLedger';
import { usePayments } from '@/hooks/usePayments';
import { useActivityLog, type ActivityEntry } from '@/hooks/useActivityLog';
import { useAttachments } from '@/hooks/useAttachments';
import { formatCurrency, calculateSmartTotals } from '@/types/invoice';
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
import { ArrowLeft, Download, Share2, CheckCircle, Send, MoreHorizontal, Trash2, Copy, Edit, Ban, CreditCard, Clock, Activity, Paperclip, Mail, FileText, Image } from 'lucide-react';
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

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  approved: { label: 'Approved', className: 'bg-info/10 text-info border-info/20' },
  sent: { label: 'Awaiting Payment', className: 'bg-warning/10 text-warning border-warning/20' },
  paid: { label: 'Paid', className: 'bg-success/10 text-success border-success/20' },
  voided: { label: 'Voided', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  partially_paid: { label: 'Partially Paid', className: 'bg-info/10 text-info border-info/20' },
};

export default function InvoiceView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getInvoice, updateInvoice, softDeleteInvoice, voidInvoice } = useInvoices();
  const { getCompany } = useCompanies();
  const { settings } = useGlobalSettings();
  const { payments, addPayment, deletePayment, totalPaid } = usePayments(id);
  const { createVatEntries, reverseVatEntries } = useVatLedger();
  const { logActivity, fetchLogs } = useActivityLog();
  const { attachments, uploadAttachment, deleteAttachment, getPublicUrl } = useAttachments('invoice', id || '');
  const docRef = useRef<HTMLDivElement>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [sendEmailOpen, setSendEmailOpen] = useState(false);
  const [activityLogs, setActivityLogs] = useState<ActivityEntry[]>([]);

  // Payment form state
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [payMethod, setPayMethod] = useState('bank_transfer');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');

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
  const canEdit = invoice.status === 'draft' || invoice.status === 'approved';
  const isVoided = invoice.status === 'voided';
  const isDraft = invoice.status === 'draft';
  const canVoid = invoice.status === 'approved' || invoice.status === 'sent' || invoice.status === 'partially_paid';
  const canRecordPayment = invoice.status === 'sent' || invoice.status === 'partially_paid';
  const amountDue = total - totalPaid;

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
    const updatedInvoice = { ...invoice, status: 'sent' as const };
    await updateInvoice(updatedInvoice);
    // Create VAT ledger entries with the updated invoice
    await createVatEntries(updatedInvoice);
    await logActivity('invoice', invoice.id, 'approved_and_sent', `Invoice ${invoice.invoiceNumber} approved & sent`);
    toast.success('Invoice approved & sent');
    fetchLogs('invoice', invoice.id).then(setActivityLogs);
  };

  const handleVoid = async () => {
    const success = await voidInvoice(invoice.id);
    if (success) {
      // Reverse VAT ledger entries when voided
      await reverseVatEntries(invoice);
      await logActivity('invoice', invoice.id, 'voided', `Invoice ${invoice.invoiceNumber} voided`);
      toast.success('Invoice voided');
      fetchLogs('invoice', invoice.id).then(setActivityLogs);
    } else {
      toast.error('Failed to void invoice');
    }
    setVoidOpen(false);
  };

  const handleDelete = async () => {
    const result = await softDeleteInvoice(invoice.id);
    if (result.blocked) {
      toast.error(result.error);
    } else if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Invoice moved to deleted');
      navigate('/invoices');
    }
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

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) { toast.error('Enter a valid amount'); return; }
    if (amount > amountDue + 0.01) { toast.error(`Amount exceeds balance due of ${formatCurrency(amountDue, invoice.currency)}`); return; }
    const result = await addPayment({
      invoiceId: invoice.id,
      amount,
      paymentDate: payDate,
      method: payMethod,
      reference: payRef,
      notes: payNotes,
    });
    if (result) {
      const newTotalPaid = totalPaid + amount;
      if (newTotalPaid >= total) {
        updateInvoice({ ...invoice, status: 'paid' });
        await logActivity('invoice', invoice.id, 'paid', `Full payment received. Total: ${formatCurrency(newTotalPaid, invoice.currency)}`);
      } else {
        updateInvoice({ ...invoice, status: 'partially_paid' });
        await logActivity('invoice', invoice.id, 'partial_payment', `Payment of ${formatCurrency(amount, invoice.currency)} recorded. Remaining: ${formatCurrency(total - newTotalPaid, invoice.currency)}`);
      }
      toast.success('Payment recorded');
      setPaymentOpen(false);
      setPayAmount(''); setPayRef(''); setPayNotes('');
      fetchLogs('invoice', invoice.id).then(setActivityLogs);
    } else {
      toast.error('Failed to record payment');
    }
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
          </div>
        </div>

        {!isVoided && (
          <div className="flex items-center gap-2 flex-wrap">
            {canEdit && (
              <Button variant="outline" size="sm" onClick={() => navigate(`/invoices/${invoice.id}/edit`)}>
                <Edit className="mr-1.5 h-4 w-4" /> Edit
              </Button>
            )}
            {(invoice.status === 'draft' || invoice.status === 'approved') && (
              <Button variant="outline" size="sm" onClick={markApproveAndSend} className="text-info border-info/30 hover:bg-info/10">
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
                {isDraft && (
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
              <Button type="button" variant="outline" onClick={() => setPaymentOpen(false)}>Cancel</Button>
              <Button type="submit">Record Payment</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

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
          <p className="text-sm font-medium">{formatDate(invoice.dueDate)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 invoice-shadow">
          <p className="text-xs text-muted-foreground mb-1">{isVoided ? 'Amount (Voided)' : 'Amount Due'}</p>
          <p className={`text-sm font-semibold mono ${isVoided ? 'text-destructive line-through' : 'text-primary'}`}>
            {formatCurrency(isVoided ? total : amountDue, invoice.currency)}
          </p>
        </div>
      </div>

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
                          await deletePayment(p.id);
                          const remainingPaid = totalPaid - p.amount;
                          if (remainingPaid <= 0) {
                            updateInvoice({ ...invoice, status: 'sent' });
                            await logActivity('invoice', invoice.id, 'payment_removed', `Payment of ${formatCurrency(p.amount, invoice.currency)} removed. Status reverted to awaiting payment.`);
                          } else if (remainingPaid < total) {
                            updateInvoice({ ...invoice, status: 'partially_paid' });
                            await logActivity('invoice', invoice.id, 'payment_removed', `Payment of ${formatCurrency(p.amount, invoice.currency)} removed. Remaining: ${formatCurrency(total - remainingPaid, invoice.currency)}`);
                          }
                          toast.success('Payment removed');
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
