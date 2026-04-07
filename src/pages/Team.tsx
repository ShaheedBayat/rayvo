import { useState } from 'react';
import { useTeam } from '@/hooks/useTeam';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { formatDate } from '@/lib/formatDate';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Users, Trash2, Mail, Plus, Send, RefreshCw, ChevronRight, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

const roleBadgeStyle = (role: string): React.CSSProperties => {
  if (role === 'admin') return { background: 'hsl(192 75% 36% / 0.1)', color: 'hsl(192 75% 28%)', border: '1px solid hsl(192 75% 36% / 0.25)' };
  if (role === 'staff') return { background: 'hsl(210 80% 52% / 0.1)', color: 'hsl(210 80% 35%)', border: '1px solid hsl(210 80% 52% / 0.25)' };
  return { background: 'hsl(0 0% 50% / 0.08)', color: 'hsl(0 0% 35%)', border: '1px solid hsl(0 0% 50% / 0.2)' };
};

const ownerBadgeStyle: React.CSSProperties = {
  background: 'hsl(192 75% 36% / 0.08)',
  color: 'hsl(192 75% 28%)',
  border: '1px solid hsl(192 75% 36% / 0.2)',
};

const badgeBase: React.CSSProperties = { fontSize: '11px', fontWeight: 500, padding: '2px 8px', borderRadius: '20px', display: 'inline-block', textTransform: 'capitalize' as const };

const getInitials = (name: string) => {
  const parts = name.split(/[\s@]+/);
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: 'Full access, can manage team and settings',
  staff: 'Can create invoices and record payments',
  viewer: 'Read-only access to reports and data',
};

const permissionRows = [
  ['Create invoices', true, true, false],
  ['Send invoices', true, false, false],
  ['Edit draft invoices', true, true, false],
  ['Edit sent invoices', true, false, false],
  ['Delete invoices', true, false, false],
  ['Void invoices', true, false, false],
  ['Record payments', true, true, false],
  ['Create quotes', true, true, false],
  ['Create credit notes', true, true, false],
  ['Create customers', true, true, false],
  ['Delete customers', true, false, false],
  ['Create products', true, true, false],
  ['Create expenses', true, true, false],
  ['View reports', true, true, true],
  ['Manage team members', true, false, false],
  ['Change settings', true, false, false],
  ['Manage companies', true, false, false],
] as const;

export default function Team() {
  const { user } = useAuth();
  const permissions = usePermissions();
  const { members, invites, loading, sendInvite, revokeInvite, updateMemberRole, removeMember } = useTeam();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('staff');
  const [matrixOpen, setMatrixOpen] = useState(false);

  const pendingInvites = invites.filter(i => i.status === 'pending');

  const handleInvite = async () => {
    if (!inviteEmail.trim()) { toast.error('Enter an email address'); return; }
    const result = await sendInvite(inviteEmail, inviteRole);
    if (result) { toast.success(`Invite sent to ${inviteEmail}`); setInviteEmail(''); }
    else toast.error('Failed to send invite');
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    const ok = await updateMemberRole(userId, newRole);
    if (ok) toast.success(`Role updated to ${newRole}`);
    else toast.error('Failed to update role');
  };

  const handleRemove = async (userId: string, name: string) => {
    const ok = await removeMember(userId);
    if (ok) toast.success(`${name} removed from team`);
    else toast.error('Failed to remove member');
  };

  const handleRevoke = async (id: string) => {
    const ok = await revokeInvite(id);
    if (ok) toast.success('Invite revoked');
    else toast.error('Failed to revoke invite');
  };

  const handleResend = async (email: string, role: string) => {
    const result = await sendInvite(email, role);
    if (result) toast.success(`Invite resent to ${email}`);
    else toast.error('Failed to resend invite');
  };

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Team Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your team members, roles, and invitations.</p>
      </div>

      {/* SECTION 1 — Current Members */}
      <div className="rounded-xl border border-border/50 bg-card invoice-shadow mb-6 stagger-1">
        <div className="flex items-center gap-3 p-5 pb-0">
          <Users className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-base font-semibold">Team Members</h2>
          <span className="inline-flex items-center justify-center rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
            {members.length}
          </span>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 px-3 py-3">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              ))}
            </div>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No team members yet</p>
          ) : (
            <div className="space-y-1">
              {members.map(m => {
                const isCurrentUser = user?.id === m.userId;
                return (
                  <div key={m.userId} className="flex items-center justify-between rounded-lg px-3 py-3 hover:bg-secondary/40 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="h-9 w-9 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold"
                        style={{ background: 'hsl(192 75% 36% / 0.1)', color: 'hsl(192 75% 36%)' }}
                      >
                        {getInitials(m.displayName)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{m.displayName}</span>
                          {isCurrentUser && (
                            <>
                              <span className="text-xs text-muted-foreground">(You)</span>
                              <span style={{ ...ownerBadgeStyle, ...badgeBase }}>Owner</span>
                            </>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">Joined {formatDate(m.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span style={{ ...roleBadgeStyle(m.role), ...badgeBase }}>{m.role}</span>
                      {!isCurrentUser && (
                        <>
                          <Select value={m.role} onValueChange={(val) => handleRoleChange(m.userId, val)}>
                            <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(ROLE_DESCRIPTIONS).map(([role, desc]) => (
                                <SelectItem key={role} value={role}>
                                  <div>
                                    <span className="font-medium capitalize">{role}</span>
                                    <p className="text-[11px] text-muted-foreground">{desc}</p>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove team member</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Remove <strong>{m.displayName}</strong> from this company? They will lose access immediately.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRemove(m.userId, m.displayName)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2 — Pending Invites */}
      <div className="rounded-xl border border-border/50 bg-card invoice-shadow mb-6 stagger-2">
        <div className="flex items-center gap-3 p-5 pb-0">
          <Send className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-base font-semibold">Pending Invites</h2>
          {pendingInvites.length > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-warning/10 px-2.5 py-0.5 text-[11px] font-medium text-warning">
              {pendingInvites.length}
            </span>
          )}
        </div>
        <div className="p-4">
          {pendingInvites.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No pending invites</p>
          ) : (
            <div className="space-y-1">
              {pendingInvites.map(inv => (
                <div key={inv.id} className="flex items-center justify-between rounded-lg px-3 py-3 hover:bg-secondary/40 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-medium truncate block">{inv.email}</span>
                      <p className="text-xs text-muted-foreground">Invited {formatDate(inv.invitedAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span style={{ ...roleBadgeStyle(inv.role), ...badgeBase }}>{inv.role}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => handleResend(inv.email, inv.role)}
                    >
                      <RefreshCw className="h-3 w-3" /> Resend
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => handleRevoke(inv.id)}
                    >
                      Revoke
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2.5 — Role Permissions (collapsible) */}
      <div className="rounded-xl border border-border/50 bg-card invoice-shadow mb-6 stagger-2">
        <Collapsible open={matrixOpen} onOpenChange={setMatrixOpen}>
          <CollapsibleTrigger className="flex items-center gap-3 p-5 w-full text-left hover:bg-secondary/30 rounded-xl transition-colors">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold">Role Permissions</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Not sure which role to assign? See what each role can do →</p>
            </div>
            <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${matrixOpen ? 'rotate-90' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-5 pb-5">
              <div className="rounded-xl border border-border/50 overflow-hidden">
                <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr className="bg-muted/30">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Action</th>
                      <th className="text-center px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admin</th>
                      <th className="text-center px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Staff</th>
                      <th className="text-center px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Viewer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {permissionRows.map(([action, admin, staff, viewer], idx) => (
                      <tr key={action as string} className={idx % 2 === 1 ? 'bg-muted/10' : ''}>
                        <td className="px-4 py-2 text-sm">{action as string}</td>
                        {[admin, staff, viewer].map((val, ci) => (
                          <td key={ci} className="text-center px-4 py-2">
                            {val
                              ? <span style={{ color: 'hsl(152 56% 42%)' }} className="font-medium">✓</span>
                              : <span style={{ color: 'hsl(200 15% 35%)', opacity: 0.4 }}>—</span>
                            }
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* SECTION 3 — Invite Form */}
      <div className="rounded-xl border border-border/50 bg-card invoice-shadow stagger-3">
        <div className="flex items-center gap-3 p-5 pb-0">
          <Plus className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-base font-semibold">Invite a team member</h2>
        </div>
        <div className="p-5">
          <div className="flex gap-3 items-end">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Email address</label>
              <Input
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                className="h-9"
                onKeyDown={e => e.key === 'Enter' && handleInvite()}
              />
            </div>
            <div className="w-44 space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Role</label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_DESCRIPTIONS).map(([role, desc]) => (
                    <SelectItem key={role} value={role}>
                      <div>
                        <span className="font-medium capitalize">{role}</span>
                        <p className="text-[11px] text-muted-foreground">{desc}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleInvite} className="h-9 gap-1.5">
              <Send className="h-3.5 w-3.5" /> Send Invite
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
