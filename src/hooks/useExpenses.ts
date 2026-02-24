import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  currency: string;
  vendor: string;
  reference: string;
  notes: string;
  companyId: string | null;
  createdAt: string;
}

export const EXPENSE_CATEGORIES = [
  'Rent', 'Utilities', 'Salaries', 'Office Supplies', 'Travel',
  'Marketing', 'Software', 'Insurance', 'Professional Services', 'Other',
];

function mapExpense(row: any): Expense {
  return {
    id: row.id,
    date: row.date,
    category: row.category,
    description: row.description,
    amount: Number(row.amount),
    currency: row.currency,
    vendor: row.vendor,
    reference: row.reference || '',
    notes: row.notes || '',
    companyId: row.company_id,
    createdAt: row.created_at,
  };
}

export function useExpenses() {
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExpenses = useCallback(async () => {
    if (!user) { setExpenses([]); setLoading(false); return; }
    let query = supabase.from('expenses').select('*').order('date', { ascending: false });
    if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
    const { data, error } = await query;
    if (!error && data) setExpenses(data.map(mapExpense));
    setLoading(false);
  }, [user, activeCompanyId]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const addExpense = useCallback(async (expense: Omit<Expense, 'id' | 'createdAt'>) => {
    if (!user) return null;
    const { data, error } = await supabase.from('expenses').insert({
      owner_id: user.id,
      company_id: expense.companyId,
      date: expense.date,
      category: expense.category,
      description: expense.description,
      amount: expense.amount,
      currency: expense.currency,
      vendor: expense.vendor,
      reference: expense.reference,
      notes: expense.notes,
    }).select().single();
    if (!error && data) {
      const mapped = mapExpense(data);
      setExpenses(prev => [mapped, ...prev]);
      return mapped;
    }
    return null;
  }, [user]);

  const updateExpense = useCallback(async (expense: Expense) => {
    const { error } = await supabase.from('expenses').update({
      date: expense.date,
      category: expense.category,
      description: expense.description,
      amount: expense.amount,
      currency: expense.currency,
      vendor: expense.vendor,
      reference: expense.reference,
      notes: expense.notes,
      company_id: expense.companyId,
    }).eq('id', expense.id);
    if (!error) setExpenses(prev => prev.map(e => e.id === expense.id ? expense : e));
    return !error;
  }, []);

  const deleteExpense = useCallback(async (id: string) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (!error) setExpenses(prev => prev.filter(e => e.id !== id));
    return !error;
  }, []);

  return { expenses, loading, addExpense, updateExpense, deleteExpense, refetch: fetchExpenses };
}
