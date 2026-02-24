import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTeam = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    
    const [inviteRes, rolesRes] = await Promise.all([
      supabase.from('team_invites').select('*').order('invited_at', { ascending: false }),
      supabase.from('user_roles').select('user_id, role'),
    ]);
    
    if (inviteRes.data) setInvites(inviteRes.data.map(mapInvite));
    
    if (rolesRes.data) {
      const userIds = rolesRes.data.map(r => r.user_id);
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name')
          .in('user_id', userIds);
        
        const profileMap = new Map((profiles || []).map(p => [p.user_id, p.display_name || 'Unknown']));
        setMembers(rolesRes.data.map(r => ({
          userId: r.user_id,
          displayName: profileMap.get(r.user_id) || 'Unknown',
          role: r.role,
        })));
      }
    }
    setLoading(false);
  }, [user]);

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
      // Also call edge function to send email
      try {
        await supabase.functions.invoke('invite-team-member', {
          body: { email, role, inviteId: data.id },
        });
      } catch (e) {
        console.error('Failed to send invite email:', e);
      }
      return mapped;
    }
    return null;
  }, [user]);

  const deleteInvite = useCallback(async (id: string) => {
    const { error } = await supabase.from('team_invites').delete().eq('id', id);
    if (!error) setInvites(prev => prev.filter(i => i.id !== id));
    return !error;
  }, []);

  return { invites, members, loading, sendInvite, deleteInvite, refetch: fetchTeam };
}
