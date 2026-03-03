import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface TaxRate {
  id: string;
  companyId: string;
  name: string;
  rate: number;
  type: string; // 'standard' | 'zero' | 'exempt'
  active: boolean;
}

function mapTaxRate(row: any): TaxRate {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    rate: Number(row.rate),
    type: row.type,
    active: row.active,
  };
}

export function useTaxRates(companyId: string | undefined) {
  const { user } = useAuth();
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTaxRates = useCallback(async () => {
    if (!user || !companyId) { setTaxRates([]); setLoading(false); return; }
    const { data, error } = await supabase
      .from('tax_rates')
      .select('*')
      .eq('company_id', companyId)
      .order('rate', { ascending: false });
    if (!error && data) setTaxRates(data.map(mapTaxRate));
    setLoading(false);
  }, [user, companyId]);

  useEffect(() => { fetchTaxRates(); }, [fetchTaxRates]);

  const ensureDefaults = useCallback(async () => {
    if (!user || !companyId) return;
    // Check if any tax rates exist
    if (taxRates.length > 0) return;
    const defaults = [
      { name: 'Standard', rate: 15, type: 'standard' },
      { name: 'Zero-rated', rate: 0, type: 'zero' },
      { name: 'Exempt', rate: 0, type: 'exempt' },
    ];
    const { error } = await supabase.from('tax_rates').insert(
      defaults.map(d => ({
        company_id: companyId,
        owner_id: user.id,
        ...d,
      }))
    );
    if (!error) fetchTaxRates();
  }, [user, companyId, taxRates.length, fetchTaxRates]);

  const addTaxRate = useCallback(async (rate: Omit<TaxRate, 'id' | 'companyId'>) => {
    if (!user || !companyId) return false;
    const { error } = await supabase.from('tax_rates').insert({
      company_id: companyId,
      owner_id: user.id,
      name: rate.name,
      rate: rate.rate,
      type: rate.type,
      active: rate.active,
    });
    if (!error) fetchTaxRates();
    return !error;
  }, [user, companyId, fetchTaxRates]);

  const updateTaxRate = useCallback(async (id: string, updates: Partial<TaxRate>) => {
    const { error } = await supabase.from('tax_rates').update({
      ...(updates.name !== undefined && { name: updates.name }),
      ...(updates.rate !== undefined && { rate: updates.rate }),
      ...(updates.type !== undefined && { type: updates.type }),
      ...(updates.active !== undefined && { active: updates.active }),
    }).eq('id', id);
    if (!error) fetchTaxRates();
    return !error;
  }, [fetchTaxRates]);

  const deleteTaxRate = useCallback(async (id: string) => {
    const { error } = await supabase.from('tax_rates').delete().eq('id', id);
    if (!error) fetchTaxRates();
    return !error;
  }, [fetchTaxRates]);

  return { taxRates, loading, ensureDefaults, addTaxRate, updateTaxRate, deleteTaxRate, refetch: fetchTaxRates };
}
