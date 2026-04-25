import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import InvoiceDocument from '@/components/invoice/InvoiceDocument';
import { calculateSmartTotals, formatCurrency } from '@/types/invoice';
import type { Invoice, Company } from '@/types/invoice';

export default function PublicQuote() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const token = searchParams.get('token');
  const presetAction = searchParams.get('action');

  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState<any>(null);
  const [company, setCompany] = useState<Company | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!id || !token) { setLoading(false); return; }
      const { data: q } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', id)
        .eq('share_token', token)
        .maybeSingle();
      if (!q) { setLoading(false); return; }
      setQuote(q);
      if (q.company_id) {
        const { data: c } = await supabase.from('companies').select('*').eq('id', q.company_id).maybeSingle();
        if (c) {
          setCompany({
            id: c.id,
            name: c.name,
            email: c.email,
            phone: c.phone || '',
            address: c.address,
            city: c.city,
            country: c.country,
            taxNumber: c.tax_number || '',
            logo: c.logo || '',
            defaultCurrency: c.default_currency,
            pricingMode: c.pricing_mode as any,
            vatRate: Number(c.vat_rate),
            isVatRegistered: c.is_vat_registered,
          });
        }
      }
      setLoading(false);
    };
    load();
  }, [id, token]);

  // Auto-open reject dialog if URL has ?action=reject
  useEffect(() => {
    if (!loading && quote && presetAction === 'reject' && !['accepted','rejected','converted'].includes(quote.status)) {
      setRejectOpen(true);
    }
  }, [loading, quote, presetAction]);

  const respond = async (action: 'accept' | 'reject', reason?: string) => {
    if (!id || !token) return;
    setSubmitting(true);
    const { data, error } = await supabase.rpc('respond_to_quote', {
      _quote_id: id,
      _token: token,
      _action: action,
      _reason: reason || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message || 'Failed to submit response');
      return;
    }
    const result = data as any;
    if (result?.error) {
      toast.error(result.error);
      // refetch to reflect current status
      const { data: q } = await supabase.from('quotes').select('*').eq('id', id).eq('share_token', token).maybeSingle();
      if (q) setQuote(q);
      return;
    }
    toast.success(action === 'accept' ? 'Quote accepted!' : 'Quote rejected');
    // Reload quote to reflect new status
    const { data: q } = await supabase.from('quotes').select('*').eq('id', id).eq('share_token', token).maybeSingle();
    if (q) setQuote(q);
    setRejectOpen(false);
    // Strip action query param
    searchParams.delete('action');
    setSearchParams(searchParams, { replace: true });
  };

  // Auto-accept if URL had ?action=accept and quote is still actionable
  useEffect(() => {
    if (!loading && quote && presetAction === 'accept' && !['accepted','rejected','converted'].includes(quote.status)) {
      respond('accept');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, quote, presetAction]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Quote not found or link is invalid.</p>
      </div>
    );
  }

  const pricingMode = company?.pricingMode || 'exclusive';
  const isVatRegistered = company?.isVatRegistered ?? false;
  const totals = calculateSmartTotals(quote.items || [], Number(quote.tax_rate), pricingMode, isVatRegistered);

  // Build an Invoice-shaped object for InvoiceDocument
  const invoiceLike: Invoice = {
    id: quote.id,
    invoiceNumber: quote.quote_number,
    companyId: quote.company_id || '',
    clientName: quote.client_name,
    clientEmail: quote.client_email || '',
    clientAddress: quote.client_address || '',
    items: quote.items || [],
    taxRate: Number(quote.tax_rate),
    currency: quote.currency,
    status: 'draft',
    notes: quote.notes || '',
    createdAt: quote.created_at,
    dueDate: quote.valid_until,
  } as Invoice;

  const status = quote.status as string;
  const isFinal = ['accepted', 'rejected', 'converted'].includes(status);

  return (
    <div className="min-h-screen bg-secondary/30 py-12 px-4">
      {/* Status banner */}
      {status === 'converted' && (
        <div className="max-w-3xl mx-auto mb-6 rounded-lg border border-green-500/20 bg-green-50 dark:bg-green-950/20 p-4 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <p className="text-sm font-medium text-green-800 dark:text-green-300">You accepted this quote. An invoice has been generated.</p>
        </div>
      )}
      {status === 'rejected' && (
        <div className="max-w-3xl mx-auto mb-6 rounded-lg border border-destructive/20 bg-destructive/5 p-4 flex items-center gap-3">
          <XCircle className="h-5 w-5 text-destructive" />
          <p className="text-sm font-medium text-destructive">You rejected this quote.</p>
        </div>
      )}

      {/* Action buttons (only when actionable) */}
      {!isFinal && (
        <div className="max-w-3xl mx-auto mb-6 rounded-xl border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Quote total</p>
              <p className="text-2xl font-bold mono">{formatCurrency(totals.total, quote.currency)}</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => respond('accept')} disabled={submitting} className="bg-green-600 hover:bg-green-700 gap-2">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Accept Quote
              </Button>
              <Button onClick={() => setRejectOpen(true)} disabled={submitting} variant="destructive" className="gap-2">
                <XCircle className="h-4 w-4" />
                Reject Quote
              </Button>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Accepting will automatically convert this quote into an invoice.</p>
        </div>
      )}

      <InvoiceDocument invoice={invoiceLike} company={company} />

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject this quote?</DialogTitle>
            <DialogDescription>
              Optionally let the sender know why you're rejecting it.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason (optional)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={submitting}>Cancel</Button>
            <Button variant="destructive" onClick={() => respond('reject', rejectReason)} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}