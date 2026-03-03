import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface GlobalSettings {
  id: string;
  bankingDetails: string;
  termsConditions: string;
}

export function useGlobalSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    if (!user) { setSettings(null); setLoading(false); return; }
    const { data, error } = await supabase
      .from('global_settings')
      .select('*')
      .maybeSingle();
    if (!error && data) {
      setSettings({
        id: data.id,
        bankingDetails: data.banking_details || '',
        termsConditions: data.terms_conditions || '',
      });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const saveSettings = useCallback(async (bankingDetails: string, termsConditions: string) => {
    if (!user) return;
    if (settings) {
      const { error } = await supabase.from('global_settings').update({
        banking_details: bankingDetails,
        terms_conditions: termsConditions,
      }).eq('id', settings.id);
      if (!error) setSettings(prev => prev ? { ...prev, bankingDetails, termsConditions } : prev);
      return !error;
    } else {
      const { data, error } = await supabase.from('global_settings').insert({
        owner_id: user.id,
        banking_details: bankingDetails,
        terms_conditions: termsConditions,
      }).select().single();
      if (!error && data) {
        setSettings({ id: data.id, bankingDetails, termsConditions });
      }
      return !error;
    }
  }, [user, settings]);

  return { settings, loading, saveSettings, refetch: fetchSettings };
}
