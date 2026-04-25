import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export interface CustomerContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  isPrimary: boolean;
}

export interface Customer {
  id: string;
  companyId: string;
  type: 'individual' | 'company';
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  idNumber: string;
  registrationNumber: string;
  vatNumber: string;
  createdAt: string;
  // New fields
  taxIdNumber: string;
  website: string;
  notes: string;
  industry: string;
  billingStreet: string;
  billingSuburb: string;
  billingCity: string;
  billingProvince: string;
  billingPostalCode: string;
  billingCountry: string;
  deliveryStreet: string;
  deliverySuburb: string;
  deliveryCity: string;
  deliveryProvince: string;
  deliveryPostalCode: string;
  deliveryCountry: string;
  deliverySameAsBilling: boolean;
  currency: string;
  bankAccountName: string;
  bankAccountNumber: string;
  paymentReference: string;
  creditLimit: number;
  blockOnCreditLimit: boolean;
  defaultDueDays: number;
  defaultTaxRate: number;
  defaultDiscount: number;
  defaultLineAmounts: 'tax_inclusive' | 'tax_exclusive';
  salesTaxOverride: string;
  taxExempt: boolean;
  accountNumber: string;
  tags: string[];
  status: 'active' | 'inactive';
  contacts: CustomerContact[];
}

function mapCustomer(row: any): Customer {
  return {
    id: row.id,
    companyId: row.company_id || '',
    type: row.type,
    name: row.name,
    email: row.email || '',
    phone: row.phone || '',
    address: row.address || '',
    city: row.city || '',
    country: row.country || '',
    idNumber: row.id_number || '',
    registrationNumber: row.registration_number || '',
    vatNumber: row.vat_number || '',
    createdAt: row.created_at,
    taxIdNumber: row.tax_id_number || '',
    website: row.website || '',
    notes: row.notes || '',
    industry: row.industry || '',
    billingStreet: row.billing_street || '',
    billingSuburb: row.billing_suburb || '',
    billingCity: row.billing_city || '',
    billingProvince: row.billing_province || '',
    billingPostalCode: row.billing_postal_code || '',
    billingCountry: row.billing_country || 'South Africa',
    deliveryStreet: row.delivery_street || '',
    deliverySuburb: row.delivery_suburb || '',
    deliveryCity: row.delivery_city || '',
    deliveryProvince: row.delivery_province || '',
    deliveryPostalCode: row.delivery_postal_code || '',
    deliveryCountry: row.delivery_country || '',
    deliverySameAsBilling: row.delivery_same_as_billing ?? true,
    currency: row.currency || 'ZAR',
    bankAccountName: row.bank_account_name || '',
    bankAccountNumber: row.bank_account_number || '',
    paymentReference: row.payment_reference || '',
    creditLimit: Number(row.credit_limit) || 0,
    blockOnCreditLimit: row.block_on_credit_limit ?? false,
    defaultDueDays: Number(row.default_due_days) || 30,
    defaultTaxRate: Number(row.default_tax_rate) || 15,
    defaultDiscount: Number(row.default_discount) || 0,
    defaultLineAmounts: row.default_line_amounts || 'tax_inclusive',
    salesTaxOverride: row.sales_tax_override || '',
    taxExempt: row.tax_exempt ?? false,
    accountNumber: row.account_number || '',
    tags: row.tags || [],
    status: row.status || 'active',
    contacts: [],
  };
}

function mapContact(row: any): CustomerContact {
  return {
    id: row.id,
    firstName: row.first_name || '',
    lastName: row.last_name || '',
    email: row.email || '',
    phone: row.phone || '',
    role: row.role || '',
    isPrimary: row.is_primary ?? false,
  };
}

export function useCustomers() {
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCustomers = useCallback(async () => {
    if (!user) { setCustomers([]); setLoading(false); return; }
    let query = supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });
    if (activeCompanyId) {
      query = query.or(`company_id.eq.${activeCompanyId},company_id.is.null`);
    }
    const { data, error } = await query;
    if (!error && data) {
      const mapped = data.map(mapCustomer);
      // Fetch contacts for all customers
      const { data: contacts } = await supabase
        .from('customer_contacts')
        .select('*')
        .in('customer_id', mapped.map(c => c.id));
      if (contacts) {
        const contactMap = new Map<string, CustomerContact[]>();
        contacts.forEach((c: any) => {
          const list = contactMap.get(c.customer_id) || [];
          list.push(mapContact(c));
          contactMap.set(c.customer_id, list);
        });
        mapped.forEach(c => { c.contacts = contactMap.get(c.id) || []; });
      }
      setCustomers(mapped);
    }
    setLoading(false);
  }, [user, activeCompanyId]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const addCustomer = useCallback(async (customer: Omit<Customer, 'createdAt'>) => {
    if (!user) return;
    const { contacts, ...rest } = customer;
    const { error } = await supabase.from('customers').insert({
      id: rest.id,
      owner_id: user.id,
      company_id: activeCompanyId || null,
      type: rest.type,
      name: rest.name,
      email: rest.email,
      phone: rest.phone,
      address: rest.address,
      city: rest.city,
      country: rest.country,
      id_number: rest.idNumber,
      registration_number: rest.registrationNumber,
      vat_number: rest.vatNumber,
      tax_id_number: rest.taxIdNumber,
      website: rest.website,
      notes: rest.notes,
      industry: rest.industry,
      billing_street: rest.billingStreet,
      billing_suburb: rest.billingSuburb,
      billing_city: rest.billingCity,
      billing_province: rest.billingProvince,
      billing_postal_code: rest.billingPostalCode,
      billing_country: rest.billingCountry,
      delivery_street: rest.deliveryStreet,
      delivery_suburb: rest.deliverySuburb,
      delivery_city: rest.deliveryCity,
      delivery_province: rest.deliveryProvince,
      delivery_postal_code: rest.deliveryPostalCode,
      delivery_country: rest.deliveryCountry,
      delivery_same_as_billing: rest.deliverySameAsBilling,
      currency: rest.currency,
      bank_account_name: rest.bankAccountName,
      bank_account_number: rest.bankAccountNumber,
      payment_reference: rest.paymentReference,
      credit_limit: rest.creditLimit,
      block_on_credit_limit: rest.blockOnCreditLimit,
      default_due_days: rest.defaultDueDays,
      default_tax_rate: rest.defaultTaxRate,
      default_discount: rest.defaultDiscount,
      default_line_amounts: rest.defaultLineAmounts,
      sales_tax_override: rest.salesTaxOverride,
      tax_exempt: rest.taxExempt,
      account_number: rest.accountNumber,
      tags: rest.tags,
      status: rest.status,
    });
    if (!error && contacts.length > 0) {
      await supabase.from('customer_contacts').insert(
        contacts.map(c => ({
          customer_id: rest.id,
          owner_id: user.id,
          first_name: c.firstName,
          last_name: c.lastName,
          email: c.email,
          phone: c.phone,
          role: c.role,
          is_primary: c.isPrimary,
        }))
      );
    }
    if (!error) await fetchCustomers();
    return error;
  }, [user, activeCompanyId, fetchCustomers]);

  const updateCustomer = useCallback(async (customer: Omit<Customer, 'createdAt'>) => {
    if (!user) return;
    const { contacts, ...rest } = customer;
    const { error } = await supabase.from('customers').update({
      type: rest.type,
      name: rest.name,
      email: rest.email,
      phone: rest.phone,
      address: rest.address,
      city: rest.city,
      country: rest.country,
      id_number: rest.idNumber,
      registration_number: rest.registrationNumber,
      vat_number: rest.vatNumber,
      tax_id_number: rest.taxIdNumber,
      website: rest.website,
      notes: rest.notes,
      industry: rest.industry,
      billing_street: rest.billingStreet,
      billing_suburb: rest.billingSuburb,
      billing_city: rest.billingCity,
      billing_province: rest.billingProvince,
      billing_postal_code: rest.billingPostalCode,
      billing_country: rest.billingCountry,
      delivery_street: rest.deliveryStreet,
      delivery_suburb: rest.deliverySuburb,
      delivery_city: rest.deliveryCity,
      delivery_province: rest.deliveryProvince,
      delivery_postal_code: rest.deliveryPostalCode,
      delivery_country: rest.deliveryCountry,
      delivery_same_as_billing: rest.deliverySameAsBilling,
      currency: rest.currency,
      bank_account_name: rest.bankAccountName,
      bank_account_number: rest.bankAccountNumber,
      payment_reference: rest.paymentReference,
      credit_limit: rest.creditLimit,
      block_on_credit_limit: rest.blockOnCreditLimit,
      default_due_days: rest.defaultDueDays,
      default_tax_rate: rest.defaultTaxRate,
      default_discount: rest.defaultDiscount,
      default_line_amounts: rest.defaultLineAmounts,
      sales_tax_override: rest.salesTaxOverride,
      tax_exempt: rest.taxExempt,
      account_number: rest.accountNumber,
      tags: rest.tags,
      status: rest.status,
    }).eq('id', rest.id);

    if (!error) {
      // Replace contacts: delete old, insert new
      await supabase.from('customer_contacts').delete().eq('customer_id', rest.id);
      if (contacts.length > 0) {
        await supabase.from('customer_contacts').insert(
          contacts.map(c => ({
            customer_id: rest.id,
            owner_id: user.id,
            first_name: c.firstName,
            last_name: c.lastName,
            email: c.email,
            phone: c.phone,
            role: c.role,
            is_primary: c.isPrimary,
          }))
        );
      }
      await fetchCustomers();
    }
    return error;
  }, [user, fetchCustomers]);

  const deleteCustomer = useCallback(async (id: string) => {
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (!error) setCustomers(prev => prev.filter(c => c.id !== id));
  }, []);

  return { customers, loading, addCustomer, updateCustomer, deleteCustomer, refetch: fetchCustomers };
}
