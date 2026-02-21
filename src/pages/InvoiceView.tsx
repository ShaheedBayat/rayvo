import { useParams, useNavigate, Link } from 'react-router-dom';
import { useInvoices, useCompanies } from '@/hooks/useInvoiceStore';
import InvoiceDocument from '@/components/invoice/InvoiceDocument';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Share2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useRef } from 'react';

export default function InvoiceView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getInvoice, updateInvoice } = useInvoices();
  const { getCompany } = useCompanies();
  const docRef = useRef<HTMLDivElement>(null);

  const invoice = getInvoice(id || '');

  if (!invoice) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Invoice not found.</p>
          <Link to="/" className="text-primary hover:underline text-sm mt-2 inline-block">Back to dashboard</Link>
        </div>
      </AppLayout>
    );
  }

  const company = getCompany(invoice.companyId);

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
    const url = `${window.location.origin}/public/invoice/${invoice.id}`;
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

  return (
    <AppLayout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex gap-2">
          {invoice.status === 'draft' && (
            <Button variant="outline" size="sm" onClick={markSent}>
              Mark as Sent
            </Button>
          )}
          {invoice.status === 'sent' && (
            <Button variant="outline" size="sm" onClick={markPaid}>
              <CheckCircle className="mr-1.5 h-4 w-4" /> Mark Paid
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="mr-1.5 h-4 w-4" /> Share Link
          </Button>
          <Button size="sm" onClick={handleExportPdf}>
            <Download className="mr-1.5 h-4 w-4" /> Export PDF
          </Button>
        </div>
      </div>

      <div ref={docRef}>
        <InvoiceDocument invoice={invoice} company={company} />
      </div>
    </AppLayout>
  );
}
