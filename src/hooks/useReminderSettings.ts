import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ReminderSettings {
  id: string;
  enabled: boolean;
  daysAfterDue: number[];
  emailTemplate: string | null;
}

export function useReminderSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data, error } = await supabase
      .from('reminder_settings')
      .select('*')
      .eq('owner_id', user.id)
      .maybeSingle();
    if (!error && data) {
      setSettings({
        id: data.id,
        enabled: data.enabled,
        daysAfterDue: data.days_after_due,
        emailTemplate: data.email_template,
      });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const saveSettings = useCallback(async (enabled: boolean, daysAfterDue: number[]) => {
    if (!user) return false;
    if (settings) {
      const { error } = await supabase.from('reminder_settings').update({
        enabled,
        days_after_due: daysAfterDue,
      }).eq('id', settings.id);
      if (!error) setSettings(prev => prev ? { ...prev, enabled, daysAfterDue } : prev);
      return !error;
    } else {
      const { data, error } = await supabase.from('reminder_settings').insert({
        owner_id: user.id,
        enabled,
        days_after_due: daysAfterDue,
      }).select().single();
      if (!error && data) {
        setSettings({
          id: data.id,
          enabled: data.enabled,
          daysAfterDue: data.days_after_due,
          emailTemplate: data.email_template,
        });
      }
      return !error;
    }
  }, [user, settings]);

  return { settings, loading, saveSettings };
}
