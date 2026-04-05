import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export interface TeamInvite {
  id: string;
  email: string;
  role: string;
  status: string;
  invitedAt: string;
  acceptedAt: string | null;
}

export interface TeamMember {
  userId: string;
  displayName: string;
  role: string;
  createdAt: string;
}

function mapInvite(row: any): TeamInvite {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    status: row.status,
    invitedAt: row.invited_at,
    acceptedAt: row.accepted_at,
  };
}

export function useTeam() {
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTeam = useCallback(async () => {
    if (!user || !activeCompanyId) { setLoading(false); return; }
    
    const [inviteRes, membersRes] = await Promise.all([
      supabase.from('team_invites').select('*').order('invited_at', { ascending: false }),
      supabase.from('company_users').select('user_id, role, created_at').eq('company_id', activeCompanyId),
    ]);
    
    if (inviteRes.data) setInvites(inviteRes.data.map(mapInvite));
    
    if (membersRes.data && membersRes.data.length > 0) {
      const userIds = membersRes.data.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', userIds);
      
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p.display_name || 'Unknown']));
      setMembers(membersRes.data.map(r => ({
        userId: r.user_id,
        displayName: profileMap.get(r.user_id) || 'Unknown',
        role: r.role,
        createdAt: r.created_at,
      })));
    } else {
      setMembers([]);
    }
    setLoading(false);
  }, [user, activeCompanyId]);

  useEffect(() => { fetchTeam(); }, [fetchTeam]);

  const sendInvite = useCallback(async (email: string, role: string) => {
    if (!user) return null;
    const { data, error } = await supabase.from('team_invites').insert({
      owner_id: user.id,
      email,
      role,
    }).select().single();
    if (!error && data) {
      const mapped = mapInvite(data);
      setInvites(prev => [mapped, ...prev]);
      try {
        await supabase.functions.invoke('invite-team-member', {
          body: { email, role, inviteId: data.id, companyId: activeCompanyId },
        });
      } catch (e) {
        console.error('Failed to send invite email:', e);
      }
      return mapped;
    }
    return null;
  }, [user, activeCompanyId]);

  const deleteInvite = useCallback(async (id: string) => {
    const { error } = await supabase.from('team_invites').delete().eq('id', id);
    if (!error) setInvites(prev => prev.filter(i => i.id !== id));
    return !error;
  }, []);

  const revokeInvite = useCallback(async (id: string) => {
    const { error } = await supabase.from('team_invites').update({ status: 'revoked' }).eq('id', id);
    if (!error) setInvites(prev => prev.map(i => i.id === id ? { ...i, status: 'revoked' } : i));
    return !error;
  }, []);

  const updateMemberRole = useCallback(async (userId: string, newRole: string) => {
    if (!activeCompanyId) return false;
    const { error } = await supabase
      .from('company_users')
      .update({ role: newRole })
      .eq('company_id', activeCompanyId)
      .eq('user_id', userId);
    if (!error) {
      setMembers(prev => prev.map(m => m.userId === userId ? { ...m, role: newRole } : m));
      return true;
    }
    return false;
  }, [activeCompanyId]);

  const removeMember = useCallback(async (userId: string) => {
    if (!activeCompanyId) return false;
    const { error } = await supabase
      .from('company_users')
      .delete()
      .eq('company_id', activeCompanyId)
      .eq('user_id', userId);
    if (!error) {
      setMembers(prev => prev.filter(m => m.userId !== userId));
      return true;
    }
    return false;
  }, [activeCompanyId]);

  return { invites, members, loading, sendInvite, deleteInvite, revokeInvite, updateMemberRole, removeMember, refetch: fetchTeam };
}
