import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { InvoiceItem, Currency } from '@/types/invoice';

export interface InvoiceTemplate {
  id: string;
  name: string;
  description: string;
  currency: Currency;
  items: InvoiceItem[];
  taxRate: number;
  notes: string;
  createdAt: string;
}

function mapTemplate(row: any): InvoiceTemplate {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    currency: row.currency as Currency,
    items: (row.items as InvoiceItem[]) || [],
    taxRate: Number(row.tax_rate),
    notes: row.notes || '',
    createdAt: row.created_at,
  };
}

export function useInvoiceTemplates() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    if (!user) { setTemplates([]); setLoading(false); return; }
    const { data, error } = await supabase
      .from('invoice_templates')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setTemplates(data.map(mapTemplate));
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const addTemplate = useCallback(async (t: Omit<InvoiceTemplate, 'id' | 'createdAt'>) => {
    if (!user) return null;
    const { data, error } = await supabase.from('invoice_templates').insert({
      owner_id: user.id,
      name: t.name,
      description: t.description,
      currency: t.currency,
      items: t.items as any,
      tax_rate: t.taxRate,
      notes: t.notes,
    }).select().single();
    if (!error && data) {
      const newT = mapTemplate(data);
      setTemplates(prev => [newT, ...prev]);
      return newT;
    }
    return null;
  }, [user]);

  const updateTemplate = useCallback(async (id: string, t: Partial<Omit<InvoiceTemplate, 'id' | 'createdAt'>>) => {
    const updateData: any = {};
    if (t.name !== undefined) updateData.name = t.name;
    if (t.description !== undefined) updateData.description = t.description;
    if (t.currency !== undefined) updateData.currency = t.currency;
    if (t.items !== undefined) updateData.items = t.items;
    if (t.taxRate !== undefined) updateData.tax_rate = t.taxRate;
    if (t.notes !== undefined) updateData.notes = t.notes;
    const { error } = await supabase.from('invoice_templates').update(updateData).eq('id', id);
    if (!error) {
      setTemplates(prev => prev.map(x => x.id === id ? { ...x, ...t } : x));
      return true;
    }
    return false;
  }, []);

  const deleteTemplate = useCallback(async (id: string) => {
    const { error } = await supabase.from('invoice_templates').delete().eq('id', id);
    if (!error) setTemplates(prev => prev.filter(x => x.id !== id));
    return !error;
  }, []);

  return { templates, loading, addTemplate, updateTemplate, deleteTemplate, refetch: fetchTemplates };
}
