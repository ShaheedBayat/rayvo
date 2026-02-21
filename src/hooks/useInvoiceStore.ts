import { useState, useEffect, useCallback } from 'react';
import type { Invoice, Company } from '@/types/invoice';

const INVOICES_KEY = 'rayn_invoices';
const COMPANIES_KEY = 'rayn_companies';

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T) {
  localStorage.setItem(key, JSON.stringify(data));
}

export function useInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>(() => loadFromStorage(INVOICES_KEY, []));

  useEffect(() => { saveToStorage(INVOICES_KEY, invoices); }, [invoices]);

  const addInvoice = useCallback((invoice: Invoice) => {
    setInvoices(prev => [invoice, ...prev]);
  }, []);

  const updateInvoice = useCallback((invoice: Invoice) => {
    setInvoices(prev => prev.map(i => i.id === invoice.id ? invoice : i));
  }, []);

  const deleteInvoice = useCallback((id: string) => {
    setInvoices(prev => prev.filter(i => i.id !== id));
  }, []);

  const getInvoice = useCallback((id: string) => {
    return invoices.find(i => i.id === id);
  }, [invoices]);

  return { invoices, addInvoice, updateInvoice, deleteInvoice, getInvoice };
}

export function useCompanies() {
  const [companies, setCompanies] = useState<Company[]>(() => loadFromStorage(COMPANIES_KEY, []));

  useEffect(() => { saveToStorage(COMPANIES_KEY, companies); }, [companies]);

  const addCompany = useCallback((company: Company) => {
    setCompanies(prev => [...prev, company]);
  }, []);

  const updateCompany = useCallback((company: Company) => {
    setCompanies(prev => prev.map(c => c.id === company.id ? company : c));
  }, []);

  const deleteCompany = useCallback((id: string) => {
    setCompanies(prev => prev.filter(c => c.id !== id));
  }, []);

  const getCompany = useCallback((id: string) => {
    return companies.find(c => c.id === id);
  }, [companies]);

  return { companies, addCompany, updateCompany, deleteCompany, getCompany };
}
