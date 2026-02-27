import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Invoice, Company, InvoiceItem } from '@/types/invoice';

// Map DB row to app Company type
function mapCompany(row: any): Company {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone || '',
    address: row.address,
    city: row.city,
    country: row.country,
    taxNumber: row.tax_number || '',
    logo: row.logo || '',
    isVatRegistered: row.is_vat_registered ?? false,
    vatRate: row.vat_rate ?? 15,
  };
}

// Map DB row to app Invoice type
function mapInvoice(row: any): Invoice {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    companyId: row.company_id || '',
    clientName: row.client_name,
    clientEmail: row.client_email || '',
    clientAddress: row.client_address || '',
    currency: row.currency as any,
    items: (row.items as InvoiceItem[]) || [],
    taxRate: Number(row.tax_rate),
    notes: row.notes || '',
    status: row.status as any,
    createdAt: row.created_at,
    dueDate: row.due_date,
    shareToken: row.share_token || undefined,
  };
}

export function useInvoices() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvoices = useCallback(async () => {
    if (!user) { setInvoices([]); setLoading(false); return; }
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (!error && data) setInvoices(data.map(mapInvoice));
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const addInvoice = useCallback(async (invoice: Invoice) => {
    if (!user) return;
    const { data, error } = await supabase.from('invoices').insert({
      id: invoice.id,
      owner_id: user.id,
      invoice_number: 'TEMP', // will be overridden by DB trigger
      company_id: invoice.companyId || null,
      client_name: invoice.clientName,
      client_email: invoice.clientEmail,
      client_address: invoice.clientAddress,
      currency: invoice.currency,
      items: invoice.items as any,
      tax_rate: invoice.taxRate,
      notes: invoice.notes,
      status: invoice.status,
      due_date: invoice.dueDate,
    }).select().single();
    if (!error && data) {
      const newInvoice = mapInvoice(data);
      setInvoices(prev => [newInvoice, ...prev]);
      return newInvoice;
    }
    return null;
  }, [user]);

  const updateInvoice = useCallback(async (invoice: Invoice) => {
    const { error } = await supabase.from('invoices').update({
      invoice_number: invoice.invoiceNumber,
      company_id: invoice.companyId || null,
      client_name: invoice.clientName,
      client_email: invoice.clientEmail,
      client_address: invoice.clientAddress,
      currency: invoice.currency,
      items: invoice.items as any,
      tax_rate: invoice.taxRate,
      notes: invoice.notes,
      status: invoice.status,
      due_date: invoice.dueDate,
      share_token: invoice.shareToken || null,
    }).eq('id', invoice.id);
    if (!error) setInvoices(prev => prev.map(i => i.id === invoice.id ? invoice : i));
  }, []);

  const softDeleteInvoice = useCallback(async (id: string) => {
    const { data, error } = await supabase.rpc('soft_delete_invoice', { p_invoice_id: id });
    if (error) {
      return { error: error.message };
    }
    const result = data as any;
    if (result?.error) {
      return { error: result.error, blocked: false };
    }
    if (result?.blocked) {
      setInvoices(prev => prev.filter(i => i.id !== id));
      return { error: result.message, blocked: true };
    }
    setInvoices(prev => prev.filter(i => i.id !== id));
    return { error: null, blocked: false };
  }, []);

  const voidInvoice = useCallback(async (id: string) => {
    const { error } = await supabase.from('invoices').update({ status: 'voided' }).eq('id', id);
    if (!error) setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: 'voided' as const } : i));
    return !error;
  }, []);

  // Fetch deleted invoices
  const fetchDeletedInvoices = useCallback(async () => {
    if (!user) return [];
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });
    if (!error && data) return data.map(mapInvoice);
    return [];
  }, [user]);

  const getInvoice = useCallback((id: string) => {
    return invoices.find(i => i.id === id);
  }, [invoices]);

  return { invoices, loading, addInvoice, updateInvoice, softDeleteInvoice, voidInvoice, getInvoice, fetchDeletedInvoices, refetch: fetchInvoices };
}

export function useCompanies() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCompanies = useCallback(async () => {
    if (!user) { setCompanies([]); setLoading(false); return; }
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setCompanies(data.map(mapCompany));
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  const addCompany = useCallback(async (company: Company): Promise<boolean> => {
    if (!user) return false;
    const { error } = await supabase.from('companies').insert({
      id: company.id,
      owner_id: user.id,
      name: company.name,
      email: company.email,
      phone: company.phone,
      address: company.address,
      city: company.city,
      country: company.country,
      tax_number: company.taxNumber,
      logo: company.logo,
      is_vat_registered: company.isVatRegistered ?? false,
      vat_rate: company.vatRate ?? 15,
    });
    if (error) return false;
    setCompanies(prev => [company, ...prev]);
    return true;
  }, [user]);

  const updateCompany = useCallback(async (company: Company) => {
    const { error } = await supabase.from('companies').update({
      name: company.name,
      email: company.email,
      phone: company.phone,
      address: company.address,
      city: company.city,
      country: company.country,
      tax_number: company.taxNumber,
      logo: company.logo,
      is_vat_registered: company.isVatRegistered ?? false,
      vat_rate: company.vatRate ?? 15,
    }).eq('id', company.id);
    if (!error) setCompanies(prev => prev.map(c => c.id === company.id ? company : c));
  }, []);

  const deleteCompany = useCallback(async (id: string) => {
    const { error } = await supabase.from('companies').delete().eq('id', id);
    if (!error) setCompanies(prev => prev.filter(c => c.id !== id));
  }, []);

  const getCompany = useCallback((id: string) => {
    return companies.find(c => c.id === id);
  }, [companies]);

  return { companies, loading, addCompany, updateCompany, deleteCompany, getCompany, refetch: fetchCompanies };
}

// For public invoice viewing (no auth required)
export function usePublicInvoice(id: string, token: string | null) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      if (!id || !token) { setLoading(false); return; }
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', id)
        .eq('share_token', token)
        .maybeSingle();
      if (error || !data) { setLoading(false); return; }
      const inv = mapInvoice(data);
      setInvoice(inv);
      if (inv.companyId) {
        const { data: compData } = await supabase
          .from('companies')
          .select('*')
          .eq('id', inv.companyId)
          .maybeSingle();
        if (compData) setCompany(mapCompany(compData));
      }
      setLoading(false);
    }
    fetch();
  }, [id, token]);

  return { invoice, company, loading };
}
