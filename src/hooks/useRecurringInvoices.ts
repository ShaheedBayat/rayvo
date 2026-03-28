import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { InvoiceItem, Currency } from '@/types/invoice';

export interface RecurringInvoice {
  id: string;
  companyId: string;
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  currency: Currency;
  items: InvoiceItem[];
  taxRate: number;
  notes: string;
  frequency: 'monthly' | 'weekly' | 'yearly';
  dayOfMonth: number;
  nextRunDate: string;
  endDate: string | null;
  isActive: boolean;
  createdAt: string;
  lastGeneratedAt: string | null;
}

function mapRecurring(row: any): RecurringInvoice {
  return {
    id: row.id,
    companyId: row.company_id || '',
    clientName: row.client_name,
    clientEmail: row.client_email || '',
    clientAddress: row.client_address || '',
    currency: row.currency as Currency,
    items: (row.items as InvoiceItem[]) || [],
    taxRate: Number(row.tax_rate),
    notes: row.notes || '',
    frequency: row.frequency,
    dayOfMonth: row.day_of_month || 1,
    nextRunDate: row.next_run_date,
    endDate: row.end_date || null,
    isActive: row.is_active,
    createdAt: row.created_at,
    lastGeneratedAt: row.last_generated_at || null,
  };
}

export function useRecurringInvoices() {
  const { user } = useAuth();
  const [recurring, setRecurring] = useState<RecurringInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) { setRecurring([]); setLoading(false); return; }
    const { data, error } = await supabase
      .from('recurring_invoices')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setRecurring(data.map(mapRecurring));
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const addRecurring = useCallback(async (r: Omit<RecurringInvoice, 'id' | 'createdAt' | 'lastGeneratedAt'>) => {
    if (!user) return null;
    const { data, error } = await supabase.from('recurring_invoices').insert({
      owner_id: user.id,
      company_id: r.companyId || null,
      client_name: r.clientName,
      client_email: r.clientEmail,
      client_address: r.clientAddress,
      currency: r.currency,
      items: r.items as any,
      tax_rate: r.taxRate,
      notes: r.notes,
      frequency: r.frequency,
      day_of_month: r.dayOfMonth,
      next_run_date: r.nextRunDate,
      is_active: r.isActive,
    }).select().single();
    if (!error && data) {
      const mapped = mapRecurring(data);
      setRecurring(prev => [mapped, ...prev]);
      return mapped;
    }
    return null;
  }, [user]);

  const updateRecurring = useCallback(async (id: string, updates: Partial<RecurringInvoice>) => {
    const dbUpdates: any = {};
    if (updates.companyId !== undefined) dbUpdates.company_id = updates.companyId || null;
    if (updates.clientName !== undefined) dbUpdates.client_name = updates.clientName;
    if (updates.clientEmail !== undefined) dbUpdates.client_email = updates.clientEmail;
    if (updates.clientAddress !== undefined) dbUpdates.client_address = updates.clientAddress;
    if (updates.currency !== undefined) dbUpdates.currency = updates.currency;
    if (updates.items !== undefined) dbUpdates.items = updates.items as any;
    if (updates.taxRate !== undefined) dbUpdates.tax_rate = updates.taxRate;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.frequency !== undefined) dbUpdates.frequency = updates.frequency;
    if (updates.dayOfMonth !== undefined) dbUpdates.day_of_month = updates.dayOfMonth;
    if (updates.nextRunDate !== undefined) dbUpdates.next_run_date = updates.nextRunDate;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
    const { error } = await supabase.from('recurring_invoices').update(dbUpdates).eq('id', id);
    if (!error) setRecurring(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    return !error;
  }, []);

  const deleteRecurring = useCallback(async (id: string) => {
    const { error } = await supabase.from('recurring_invoices').delete().eq('id', id);
    if (!error) setRecurring(prev => prev.filter(r => r.id !== id));
    return !error;
  }, []);

  // Trigger the edge function to process any due recurring invoices
  const processRecurring = useCallback(async () => {
    if (!user) return { created: 0 };
    try {
      const { data, error } = await supabase.functions.invoke('process-recurring-invoices');
      if (error) {
        console.error('Failed to process recurring invoices:', error);
        return { created: 0 };
      }
      // Refetch to update next_run_date and last_generated_at
      await fetch();
      return data as { created: number; processed: number };
    } catch (err) {
      console.error('Error processing recurring invoices:', err);
      return { created: 0 };
    }
  }, [user, fetch]);

  return { recurring, loading, addRecurring, updateRecurring, deleteRecurring, processRecurring, refetch: fetch };
}
