import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  paymentDate: string;
  method: string;
  reference: string;
  notes: string;
  createdAt: string;
}

function mapPayment(row: any): Payment {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    amount: Number(row.amount),
    paymentDate: row.payment_date,
    method: row.method,
    reference: row.reference || '',
    notes: row.notes || '',
    createdAt: row.created_at,
  };
}

export function usePayments(invoiceId?: string) {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPayments = useCallback(async () => {
    if (!user || !invoiceId) { setPayments([]); setLoading(false); return; }
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('payment_date', { ascending: false });
    if (!error && data) setPayments(data.map(mapPayment));
    setLoading(false);
  }, [user, invoiceId]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const addPayment = useCallback(async (payment: Omit<Payment, 'id' | 'createdAt'>) => {
    if (!user) return null;
    const { data, error } = await supabase.from('payments').insert({
      owner_id: user.id,
      invoice_id: payment.invoiceId,
      amount: payment.amount,
      payment_date: payment.paymentDate,
      method: payment.method,
      reference: payment.reference,
      notes: payment.notes,
    }).select().single();
    if (!error && data) {
      const mapped = mapPayment(data);
      setPayments(prev => [mapped, ...prev]);
      return mapped;
    }
    return null;
  }, [user]);

  const deletePayment = useCallback(async (id: string) => {
    const { error } = await supabase.from('payments').delete().eq('id', id);
    if (!error) setPayments(prev => prev.filter(p => p.id !== id));
  }, []);

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  return { payments, loading, addPayment, deletePayment, totalPaid, refetch: fetchPayments };
}

/**
 * Fetch ALL payments for the current user (for reports/overview).
 * Returns payments grouped by invoiceId for easy lookup.
 */
export function useAllPayments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) { setPayments([]); setLoading(false); return; }
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .order('payment_date', { ascending: false });
    if (!error && data) setPayments(data.map(mapPayment));
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /** Total paid for a specific invoice */
  const paidForInvoice = useCallback((invoiceId: string) => {
    return payments.filter(p => p.invoiceId === invoiceId).reduce((s, p) => s + p.amount, 0);
  }, [payments]);

  const totalRevenue = payments.reduce((s, p) => s + p.amount, 0);

  return { payments, loading, paidForInvoice, totalRevenue };
}
