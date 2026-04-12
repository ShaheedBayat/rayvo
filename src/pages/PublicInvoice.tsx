import { useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { usePublicInvoice } from '@/hooks/useInvoiceStore';
import InvoiceDocument from '@/components/invoice/InvoiceDocument';
import { Button } from '@/components/ui/button';
import { CreditCard, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatCurrency, calculateSmartTotals } from '@/types/invoice';

export default function PublicInvoice() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const paymentResult = searchParams.get('payment');
  const { invoice, company, totalPaid, loading } = usePublicInvoice(id || '', token);
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

  const pricingMode = company?.pricingMode || 'exclusive';
  const isVatRegistered = company?.isVatRegistered ?? false;
  const smartTotals = calculateSmartTotals(invoice.items, invoice.taxRate, pricingMode, isVatRegistered);
  const total = smartTotals.total;
  const balanceDue = total - totalPaid;
  const hasPartialPayment = totalPaid > 0 && balanceDue > 0.01;
  const canPay = invoice.status === 'sent' || invoice.status === 'approved' || invoice.status === 'partially_paid';

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

      {/* Payment summary bar for partial payments */}
      {totalPaid > 0 && (
        <div className="max-w-3xl mx-auto mb-6 rounded-lg border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-muted-foreground">Invoice Total</span>
                <p className="font-semibold mono">{formatCurrency(total, invoice.currency)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Amount Paid</span>
                <p className="font-semibold mono text-success">{formatCurrency(totalPaid, invoice.currency)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Balance Due</span>
                <p className={`font-semibold mono ${balanceDue <= 0.01 ? 'text-success' : 'text-primary'}`}>
                  {formatCurrency(Math.max(0, balanceDue), invoice.currency)}
                </p>
              </div>
            </div>
            {balanceDue <= 0.01 && (
              <div className="flex items-center gap-1.5 text-success">
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium text-xs">Paid in Full</span>
              </div>
            )}
          </div>
        </div>
      )}

      {canPay && (
        <div className="max-w-3xl mx-auto mb-6 flex justify-center">
          <Button onClick={handlePayNow} disabled={payLoading} size="lg" className="gap-2">
            <CreditCard className="h-5 w-5" />
            {payLoading ? 'Redirecting to PayFast...' : hasPartialPayment ? `Pay ${formatCurrency(balanceDue, invoice.currency)}` : 'Pay Now'}
          </Button>
        </div>
      )}

      <InvoiceDocument invoice={invoice} company={company} />

      {/* Hidden form for PayFast redirect */}
      <form ref={formRef} method="POST" className="hidden" />
    </div>
  );
}
