import { useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { usePublicInvoice } from '@/hooks/useInvoiceStore';
import InvoiceDocument from '@/components/invoice/InvoiceDocument';
import { Button } from '@/components/ui/button';
import { CreditCard, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function PublicInvoice() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const paymentResult = searchParams.get('payment');
  const { invoice, company, loading } = usePublicInvoice(id || '', token);
  const [payLoading, setPayLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const handlePayNow = async () => {
    if (!id || !token) return;
    setPayLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('payfast-checkout', {
        body: { invoiceId: id, token },
      });
      if (error || !data?.payfast_url) {
        toast.error(data?.error || 'Failed to initiate payment');
        return;
      }
      // Create a hidden form and submit to PayFast
      const form = formRef.current;
      if (!form) return;
      form.action = data.payfast_url;
      form.innerHTML = '';
      Object.entries(data.form_data as Record<string, string>).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value;
        form.appendChild(input);
      });
      form.submit();
    } catch {
      toast.error('Payment initiation failed');
    } finally {
      setPayLoading(false);
    }
  };

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

  const canPay = invoice.status === 'sent' || invoice.status === 'approved';

  return (
    <div className="min-h-screen bg-secondary/30 py-12 px-4">
      {paymentResult === 'success' && (
        <div className="max-w-3xl mx-auto mb-6 rounded-lg border border-green-500/20 bg-green-50 dark:bg-green-950/20 p-4 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <p className="text-sm font-medium text-green-800 dark:text-green-300">Payment successful! Thank you.</p>
        </div>
      )}
      {paymentResult === 'cancelled' && (
        <div className="max-w-3xl mx-auto mb-6 rounded-lg border border-destructive/20 bg-destructive/5 p-4 flex items-center gap-3">
          <XCircle className="h-5 w-5 text-destructive" />
          <p className="text-sm font-medium text-destructive">Payment was cancelled.</p>
        </div>
      )}

      {canPay && (
        <div className="max-w-3xl mx-auto mb-6 flex justify-center">
          <Button onClick={handlePayNow} disabled={payLoading} size="lg" className="gap-2">
            <CreditCard className="h-5 w-5" />
            {payLoading ? 'Redirecting to PayFast...' : 'Pay Now'}
          </Button>
        </div>
      )}

      <InvoiceDocument invoice={invoice} company={company} />

      {/* Hidden form for PayFast redirect */}
      <form ref={formRef} method="POST" className="hidden" />
    </div>
  );
}
