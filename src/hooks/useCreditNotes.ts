import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import type { InvoiceItem, Currency } from '@/types/invoice';

export interface CreditNote {
  id: string;
  creditNoteNumber: string;
  companyId: string;
  invoiceId: string | null;
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  items: InvoiceItem[];
  taxRate: number;
  currency: Currency;
  status: 'draft' | 'approved' | 'sent' | 'available' | 'applied' | 'partially_applied';
  notes: string;
  createdAt: string;
  dueDate: string;
}

function mapCreditNote(row: any): CreditNote {
  return {
    id: row.id,
    creditNoteNumber: row.credit_note_number,
    companyId: row.company_id || '',
    invoiceId: row.invoice_id || null,
    clientName: row.client_name,
    clientEmail: row.client_email || '',
    clientAddress: row.client_address || '',
    items: (row.items as InvoiceItem[]) || [],
    taxRate: Number(row.tax_rate),
    currency: row.currency as Currency,
    status: row.status as any,
    notes: row.notes || '',
    createdAt: row.created_at,
    dueDate: row.due_date,
  };
}

export function useCreditNotes() {
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCreditNotes = useCallback(async () => {
    if (!user) { setCreditNotes([]); setLoading(false); return; }
    let query = supabase
      .from('credit_notes')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
    const { data, error } = await query;
    if (!error && data) setCreditNotes(data.map(mapCreditNote));
    setLoading(false);
  }, [user, activeCompanyId]);

  useEffect(() => { fetchCreditNotes(); }, [fetchCreditNotes]);

  const addCreditNote = useCallback(async (cn: Omit<CreditNote, 'creditNoteNumber' | 'createdAt'>) => {
    if (!user) return null;
    const { data, error } = await supabase.from('credit_notes').insert({
      id: cn.id,
      owner_id: user.id,
      company_id: cn.companyId || null,
      invoice_id: cn.invoiceId || null,
      client_name: cn.clientName,
      client_email: cn.clientEmail,
      client_address: cn.clientAddress,
      items: cn.items as any,
      tax_rate: cn.taxRate,
      currency: cn.currency,
      status: cn.status,
      notes: cn.notes,
      due_date: cn.dueDate,
      credit_note_number: 'TEMP',
    }).select().single();
    if (!error && data) {
      const mapped = mapCreditNote(data);
      setCreditNotes(prev => [mapped, ...prev]);
      return mapped;
    }
    return null;
  }, [user]);

  const updateCreditNote = useCallback(async (cn: CreditNote) => {
    const { error } = await supabase.from('credit_notes').update({
      client_name: cn.clientName,
      client_email: cn.clientEmail,
      client_address: cn.clientAddress,
      items: cn.items as any,
      tax_rate: cn.taxRate,
      currency: cn.currency,
      status: cn.status,
      notes: cn.notes,
      due_date: cn.dueDate,
    }).eq('id', cn.id);
    if (!error) setCreditNotes(prev => prev.map(c => c.id === cn.id ? cn : c));
  }, []);

  const deleteCreditNote = useCallback(async (id: string) => {
    const { error } = await supabase.from('credit_notes').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (!error) setCreditNotes(prev => prev.filter(c => c.id !== id));
  }, []);

  return { creditNotes, loading, addCreditNote, updateCreditNote, deleteCreditNote, refetch: fetchCreditNotes };
}
