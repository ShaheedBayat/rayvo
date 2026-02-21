import { useParams, useSearchParams } from 'react-router-dom';
import { usePublicInvoice } from '@/hooks/useInvoiceStore';
import InvoiceDocument from '@/components/invoice/InvoiceDocument';

export default function PublicInvoice() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { invoice, company, loading } = usePublicInvoice(id || '', token);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Invoice not found or link is invalid.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/30 py-12 px-4">
      <InvoiceDocument invoice={invoice} company={company} />
    </div>
  );
}
