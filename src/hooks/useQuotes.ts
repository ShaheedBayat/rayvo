import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import type { InvoiceItem, Currency } from '@/types/invoice';

export interface Quote {
  id: string;
  quoteNumber: string;
  companyId: string;
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  items: InvoiceItem[];
  taxRate: number;
  currency: Currency;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'converted';
  notes: string;
  validUntil: string;
  createdAt: string;
  shareToken?: string | null;
  rejectionReason?: string | null;
  respondedAt?: string | null;
  convertedInvoiceId?: string | null;
}

function mapQuote(row: any): Quote {
  return {
    id: row.id,
    quoteNumber: row.quote_number,
    companyId: row.company_id || '',
    clientName: row.client_name,
    clientEmail: row.client_email || '',
    clientAddress: row.client_address || '',
    items: (row.items as InvoiceItem[]) || [],
    taxRate: Number(row.tax_rate),
    currency: row.currency as Currency,
    status: row.status as any,
    notes: row.notes || '',
    validUntil: row.valid_until,
    createdAt: row.created_at,
    shareToken: row.share_token ?? null,
    rejectionReason: row.rejection_reason ?? null,
    respondedAt: row.responded_at ?? null,
    convertedInvoiceId: row.converted_invoice_id ?? null,
  };
}

export function useQuotes() {
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuotes = useCallback(async () => {
    if (!user) { setQuotes([]); setLoading(false); return; }
    let query = supabase
      .from('quotes')
      .select('*')
      .order('created_at', { ascending: false });
    if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
    const { data, error } = await query;
    if (!error && data) setQuotes(data.map(mapQuote));
    setLoading(false);
  }, [user, activeCompanyId]);

  useEffect(() => { fetchQuotes(); }, [fetchQuotes]);

  const addQuote = useCallback(async (q: Omit<Quote, 'quoteNumber' | 'createdAt'>) => {
    if (!user) return null;
    const { data, error } = await supabase.from('quotes').insert({
      id: q.id,
      owner_id: user.id,
      company_id: q.companyId || null,
      client_name: q.clientName,
      client_email: q.clientEmail,
      client_address: q.clientAddress,
      items: q.items as any,
      tax_rate: q.taxRate,
      currency: q.currency,
      status: q.status,
      notes: q.notes,
      valid_until: q.validUntil,
      quote_number: 'TEMP',
    }).select().single();
    if (!error && data) {
      const mapped = mapQuote(data);
      setQuotes(prev => [mapped, ...prev]);
      return mapped;
    }
    return null;
  }, [user]);

  const updateQuote = useCallback(async (q: Quote) => {
    const { error } = await supabase.from('quotes').update({
      client_name: q.clientName,
      client_email: q.clientEmail,
      client_address: q.clientAddress,
      items: q.items as any,
      tax_rate: q.taxRate,
      currency: q.currency,
      status: q.status,
      notes: q.notes,
      valid_until: q.validUntil,
      converted_invoice_id: q.convertedInvoiceId ?? null,
    }).eq('id', q.id);
    if (!error) setQuotes(prev => prev.map(c => c.id === q.id ? q : c));
  }, []);

  const deleteQuote = useCallback(async (id: string) => {
    const { error } = await supabase.from('quotes').delete().eq('id', id);
    if (!error) setQuotes(prev => prev.filter(q => q.id !== id));
  }, []);

  const sendQuote = useCallback(async (q: Quote, companyName: string, totalAmount: number) => {
    // Ensure share_token exists
    let token = q.shareToken;
    if (!token) {
      token = crypto.randomUUID().replace(/-/g, '');
      const { error: tokErr } = await supabase
        .from('quotes')
        .update({ share_token: token })
        .eq('id', q.id);
      if (tokErr) return { error: tokErr.message };
    }

    const baseUrl = window.location.origin;
    const publicUrl = `${baseUrl}/public/quote/${q.id}?token=${token}`;

    const { data, error } = await supabase.functions.invoke('send-quote-email', {
      body: {
        emails: [q.clientEmail],
        quoteNumber: q.quoteNumber,
        clientName: q.clientName,
        amount: totalAmount.toFixed(2),
        currency: q.currency,
        validUntil: q.validUntil,
        publicUrl,
        companyName,
      },
    });
    if (error) return { error: error.message };
    if ((data as any)?.error) return { error: (data as any).error };

    // Mark as sent if currently draft
    if (q.status === 'draft') {
      await supabase.from('quotes').update({ status: 'sent' }).eq('id', q.id);
      setQuotes(prev => prev.map(c => c.id === q.id ? { ...c, status: 'sent', shareToken: token } : c));
    } else {
      setQuotes(prev => prev.map(c => c.id === q.id ? { ...c, shareToken: token } : c));
    }
    return { success: true };
  }, []);

  return { quotes, loading, addQuote, updateQuote, deleteQuote, sendQuote, refetch: fetchQuotes };
}
