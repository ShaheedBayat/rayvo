import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export interface ActivityEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  details: string;
  createdAt: string;
}

function mapEntry(row: any): ActivityEntry {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    action: row.action,
    details: row.details || '',
    createdAt: row.created_at,
  };
}

export function useActivityLog() {
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();

  const logActivity = useCallback(async (entityType: string, entityId: string, action: string, details?: string) => {
    if (!user || !activeCompanyId) return;
    await supabase.from('activity_log').insert({
      owner_id: user.id,
      company_id: activeCompanyId,
      entity_type: entityType,
      entity_id: entityId,
      action,
      details: details || '',
    });
  }, [user, activeCompanyId]);

  const fetchLogs = useCallback(async (entityType: string, entityId: string): Promise<ActivityEntry[]> => {
    if (!user || !activeCompanyId) return [];
    const { data, error } = await supabase
      .from('activity_log')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .eq('company_id', activeCompanyId)
      .order('created_at', { ascending: false });
    if (!error && data) return data.map(mapEntry);
    return [];
  }, [user, activeCompanyId]);

  return { logActivity, fetchLogs };
}
