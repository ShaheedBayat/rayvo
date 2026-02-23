import { useParams, useNavigate, Link } from 'react-router-dom';
import { useInvoices, useCompanies } from '@/hooks/useInvoiceStore';
import { formatCurrency, calculateTotal } from '@/types/invoice';
import InvoiceDocument from '@/components/invoice/InvoiceDocument';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, Share2, CheckCircle, Send, MoreHorizontal, Trash2, Copy } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useRef } from 'react';

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  sent: { label: 'Awaiting Payment', className: 'bg-warning/10 text-warning border-warning/20' },
  paid: { label: 'Paid', className: 'bg-success/10 text-success border-success/20' },
};

export default function InvoiceView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getInvoice, updateInvoice, deleteInvoice } = useInvoices();
  const { getCompany } = useCompanies();
  const docRef = useRef<HTMLDivElement>(null);

  const invoice = getInvoice(id || '');

  if (!invoice) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Invoice not found.</p>
          <Link to="/invoices" className="text-primary hover:underline text-sm mt-2 inline-block">
            Back to invoices
          </Link>
        </div>
      </AppLayout>
    );
  }

  const company = getCompany(invoice.companyId);
  const config = statusConfig[invoice.status] || statusConfig.draft;
  const total = calculateTotal(invoice.items, invoice.taxRate);

  const handleExportPdf = async () => {
    const element = document.getElementById('invoice-document');
    if (!element) return;
    const html2pdf = (await import('html2pdf.js')).default;
    html2pdf()
      .set({
        margin: 0.5,
        filename: `${invoice.invoiceNumber}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
      })
      .from(element)
      .save();
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

  const markPaid = () => {
    updateInvoice({ ...invoice, status: 'paid' });
    toast.success('Invoice marked as paid');
  };

  const markSent = () => {
    updateInvoice({ ...invoice, status: 'sent' });
    toast.success('Invoice marked as sent');
  };

  const handleDelete = () => {
    deleteInvoice(invoice.id);
    toast.success('Invoice deleted');
    navigate('/invoices');
  };

  return (
    <AppLayout>
      {/* Top bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/invoices')}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Invoices
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold mono">{invoice.invoiceNumber}</h1>
            <Badge variant="outline" className={`${config.className} text-[11px]`}>
              {config.label}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {invoice.status === 'draft' && (
            <Button variant="outline" size="sm" onClick={markSent}>
              <Send className="mr-1.5 h-4 w-4" /> Mark as Sent
            </Button>
          )}
          {invoice.status === 'sent' && (
            <Button variant="outline" size="sm" onClick={markPaid} className="text-success border-success/30 hover:bg-success/10">
              <CheckCircle className="mr-1.5 h-4 w-4" /> Mark as Paid
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="mr-1.5 h-4 w-4" /> Share
          </Button>
          <Button size="sm" onClick={handleExportPdf}>
            <Download className="mr-1.5 h-4 w-4" /> Download PDF
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleShare}>
                <Copy className="mr-2 h-4 w-4" /> Copy share link
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Delete invoice
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Summary strip */}
      <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-lg border bg-card p-4 invoice-shadow">
          <p className="text-xs text-muted-foreground mb-1">Customer</p>
          <p className="text-sm font-medium truncate">{invoice.clientName}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 invoice-shadow">
          <p className="text-xs text-muted-foreground mb-1">Issue Date</p>
          <p className="text-sm font-medium">{new Date(invoice.createdAt).toLocaleDateString()}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 invoice-shadow">
          <p className="text-xs text-muted-foreground mb-1">Due Date</p>
          <p className="text-sm font-medium">{new Date(invoice.dueDate).toLocaleDateString()}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 invoice-shadow">
          <p className="text-xs text-muted-foreground mb-1">Amount Due</p>
          <p className="text-sm font-semibold mono text-primary">
            {formatCurrency(total, invoice.currency)}
          </p>
        </div>
      </div>

      {/* Document */}
      <div ref={docRef}>
        <InvoiceDocument invoice={invoice} company={company} />
      </div>
    </AppLayout>
  );
}
