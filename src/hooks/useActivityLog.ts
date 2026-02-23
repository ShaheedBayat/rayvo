import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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

  const logActivity = useCallback(async (entityType: string, entityId: string, action: string, details?: string) => {
    if (!user) return;
    await supabase.from('activity_log').insert({
      owner_id: user.id,
      entity_type: entityType,
      entity_id: entityId,
      action,
      details: details || '',
    });
  }, [user]);

  const fetchLogs = useCallback(async (entityType: string, entityId: string): Promise<ActivityEntry[]> => {
    if (!user) return [];
    const { data, error } = await supabase
      .from('activity_log')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false });
    if (!error && data) return data.map(mapEntry);
    return [];
  }, [user]);

  return { logActivity, fetchLogs };
}
