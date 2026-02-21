import { useParams } from 'react-router-dom';
import { useInvoices, useCompanies } from '@/hooks/useInvoiceStore';
import InvoiceDocument from '@/components/invoice/InvoiceDocument';

export default function PublicInvoice() {
  const { id } = useParams<{ id: string }>();
  const { getInvoice } = useInvoices();
  const { getCompany } = useCompanies();

  const invoice = getInvoice(id || '');

  if (!invoice) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Invoice not found or link is invalid.</p>
      </div>
    );
  }

  const company = getCompany(invoice.companyId);

  return (
    <div className="min-h-screen bg-secondary/30 py-12 px-4">
      <InvoiceDocument invoice={invoice} company={company} />
    </div>
  );
}
