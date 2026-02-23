import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Customer {
  id: string;
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
}

function mapCustomer(row: any): Customer {
  return {
    id: row.id,
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
  };
}

export function useCustomers() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCustomers = useCallback(async () => {
    if (!user) { setCustomers([]); setLoading(false); return; }
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setCustomers(data.map(mapCustomer));
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const addCustomer = useCallback(async (customer: Omit<Customer, 'createdAt'>) => {
    if (!user) return;
    const { error } = await supabase.from('customers').insert({
      id: customer.id,
      owner_id: user.id,
      type: customer.type,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      city: customer.city,
      country: customer.country,
      id_number: customer.idNumber,
      registration_number: customer.registrationNumber,
      vat_number: customer.vatNumber,
    });
    if (!error) {
      await fetchCustomers();
    }
    return error;
  }, [user, fetchCustomers]);

  const deleteCustomer = useCallback(async (id: string) => {
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (!error) setCustomers(prev => prev.filter(c => c.id !== id));
  }, []);

  return { customers, loading, addCustomer, deleteCustomer, refetch: fetchCustomers };
}
