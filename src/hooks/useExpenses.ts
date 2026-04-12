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
  isBillable: boolean;
  customerId: string | null;
  isBilled: boolean;
  billedInvoiceId: string | null;
}

export const EXPENSE_CATEGORIES = [
  'Office', 'Software', 'Travel', 'Rent', 'Utilities', 'Salaries',
  'Marketing', 'Insurance', 'Professional Services', 'Other',
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
    isBillable: row.is_billable ?? false,
    customerId: row.customer_id ?? null,
    isBilled: row.is_billed ?? false,
    billedInvoiceId: row.billed_invoice_id ?? null,
  };
}

export function useExpenses() {
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExpenses = useCallback(async () => {
    if (!user) { setExpenses([]); setLoading(false); return; }
    setLoading(true);
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
      is_billable: expense.isBillable,
      customer_id: expense.customerId,
      is_billed: expense.isBilled,
      billed_invoice_id: expense.billedInvoiceId,
    }).select().single();
    if (error || !data) return null;
    return mapExpense(data);
  }, [user]);

  const updateExpense = useCallback(async (expense: Expense) => {
    const { data, error } = await supabase.from('expenses').update({
      date: expense.date,
      category: expense.category,
      description: expense.description,
      amount: expense.amount,
      currency: expense.currency,
      vendor: expense.vendor,
      reference: expense.reference,
      notes: expense.notes,
      company_id: expense.companyId,
      is_billable: expense.isBillable,
      customer_id: expense.customerId,
      is_billed: expense.isBilled,
      billed_invoice_id: expense.billedInvoiceId,
    }).eq('id', expense.id).select().single();
    if (error || !data) return null;
    return mapExpense(data);
  }, []);

  const markExpenseAsBilled = useCallback(async (expenseId: string, invoiceId: string) => {
    const { error } = await supabase.from('expenses').update({
      is_billed: true,
      billed_invoice_id: invoiceId,
    }).eq('id', expenseId);
    return !error;
  }, []);

  const deleteExpense = useCallback(async (id: string) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    return !error;
  }, []);

  const getUnbilledExpensesForCustomer = useCallback((customerId: string) => {
    return expenses.filter(e => e.isBillable && !e.isBilled && e.customerId === customerId);
  }, [expenses]);

  return { expenses, loading, addExpense, updateExpense, deleteExpense, markExpenseAsBilled, getUnbilledExpensesForCustomer, refetch: fetchExpenses };
}
