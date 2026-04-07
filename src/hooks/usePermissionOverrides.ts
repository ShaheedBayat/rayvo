import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useActivityLog } from '@/hooks/useActivityLog';

export interface PermissionOverride {
  userId: string;
  permissionKey: string;
  value: boolean;
}

export function usePermissionOverrides(targetUserId?: string) {
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();
  const { logActivity } = useActivityLog();
  const [overrides, setOverrides] = useState<PermissionOverride[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchOverrides = useCallback(async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    let query = supabase
      .from('user_permission_overrides' as any)
      .select('user_id, permission_key, value')
      .eq('company_id', activeCompanyId);
    if (targetUserId) {
      query = query.eq('user_id', targetUserId);
    }
    const { data, error } = await query;
    if (!error && data) {
      setOverrides((data as any[]).map((r: any) => ({
        userId: r.user_id,
        permissionKey: r.permission_key,
        value: r.value,
      })));
    }
    setLoading(false);
  }, [activeCompanyId, targetUserId]);

  useEffect(() => {
    fetchOverrides();
  }, [fetchOverrides]);

  const setOverride = useCallback(async (userId: string, permissionKey: string, value: boolean) => {
    if (!user || !activeCompanyId) return false;
    const { error } = await (supabase.from('user_permission_overrides' as any) as any)
      .upsert({
        company_id: activeCompanyId,
        user_id: userId,
        permission_key: permissionKey,
        value,
        overridden_by: user.id,
      }, { onConflict: 'company_id,user_id,permission_key' });
    if (error) return false;
    await logActivity('permission', userId, 'permission_override', `${permissionKey} set to ${value} for ${userId}`);
    await fetchOverrides();
    return true;
  }, [user, activeCompanyId, logActivity, fetchOverrides]);

  const resetOverrides = useCallback(async (userId: string) => {
    if (!user || !activeCompanyId) return false;
    const { error } = await (supabase.from('user_permission_overrides' as any) as any)
      .delete()
      .eq('company_id', activeCompanyId)
      .eq('user_id', userId);
    if (error) return false;
    await logActivity('permission', userId, 'permissions_reset', `All overrides reset to role defaults for ${userId}`);
    await fetchOverrides();
    return true;
  }, [user, activeCompanyId, logActivity, fetchOverrides]);

  return { overrides, loading, setOverride, resetOverrides, refetch: fetchOverrides };
}
