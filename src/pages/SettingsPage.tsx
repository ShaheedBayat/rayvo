import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Palette, FileText, Shield, CreditCard, Landmark, Scale, Sun, Moon, ChevronRight, Check, Users, Bell, Plus, Trash2, UserMinus } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import AppLayout from '@/components/AppLayout';
import { useTheme, colorThemes } from '@/hooks/useTheme';
import { useGlobalSettings } from '@/hooks/useGlobalSettings';
import { useTeam } from '@/hooks/useTeam';
import { useReminderSettings } from '@/hooks/useReminderSettings';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { formatDate } from '@/lib/formatDate';

export default function SettingsPage() {
  const permissions = usePermissions();
  const { theme, toggleTheme, colorTheme, setColorTheme } = useTheme();
  const { settings, saveSettings } = useGlobalSettings();
  const { invites, members, sendInvite, deleteInvite, updateMemberRole, removeMember } = useTeam();
  const { user } = useAuth();
  const { settings: reminderSettings, saveSettings: saveReminders } = useReminderSettings();
  const [banking, setBanking] = useState('');
  const [terms, setTerms] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [reminderDays, setReminderDays] = useState('1,7,14,30');

  useEffect(() => {
    if (settings) {
      setBanking(settings.bankingDetails);
      setTerms(settings.termsConditions);
    }
  }, [settings]);

  useEffect(() => {
    if (reminderSettings) {
      setRemindersEnabled(reminderSettings.enabled);
      setReminderDays(reminderSettings.daysAfterDue.join(','));
    }
  }, [reminderSettings]);

  const handleSaveSettings = async () => {
    const ok = await saveSettings(banking, terms);
    if (ok) toast.success('Settings saved');
    else toast.error('Failed to save');
  };

  const handleInvite = async () => {
    if (!inviteEmail) { toast.error('Enter an email'); return; }
    const result = await sendInvite(inviteEmail, inviteRole);
    if (result) { toast.success(`Invite sent to ${inviteEmail}`); setInviteEmail(''); }
    else toast.error('Failed to send invite');
  };

  const handleSaveReminders = async () => {
    const days = reminderDays.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d) && d > 0);
    if (days.length === 0) { toast.error('Enter at least one valid number'); return; }
    const ok = await saveReminders(remindersEnabled, days);
    if (ok) toast.success('Reminder settings saved');
    else toast.error('Failed to save');
  };

  const sections = [
    {
      icon: Palette,
      title: 'Theme & Appearance',
      description: 'Transform the entire look and feel of your workspace.',
      content: (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={toggleTheme} className="gap-2">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              Switch to {theme === 'dark' ? 'Light' : 'Dark'}
            </Button>
          </div>
          <div>
            <Label className="text-xs mb-4 block uppercase tracking-wider text-muted-foreground">Choose Your Experience</Label>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {colorThemes.map((t) => {
                const isActive = colorTheme === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setColorTheme(t.id)}
                    className={`group relative flex flex-col rounded-lg border p-4 text-left transition-all hover:scale-[1.02] ${
                      isActive
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/30'
                        : 'border-border bg-card hover:border-primary/30 hover:bg-accent/30'
                    }`}
                  >
                    <div className="mb-3 flex items-center gap-1.5">
                      <div
                        className="h-6 w-6 rounded-full ring-2 ring-offset-2 ring-offset-background"
                        style={{
                          backgroundColor: `hsl(${t.accent})`,
                          boxShadow: isActive ? `0 0 0 2px hsl(${t.accent})` : undefined,
                        }}
                      />
                      <div className="flex-1" />
                      {isActive && (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-semibold">{t.label}</span>
                    <span className="text-[11px] text-muted-foreground mt-0.5">{t.vibe}</span>
                    <p className="text-[10px] text-muted-foreground/70 mt-2 leading-relaxed">{t.description}</p>
                    <span className="mt-2 text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">{t.font}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ),
    },
    {
      icon: Landmark,
      title: 'Banking Details',
      description: 'These details appear at the bottom of every invoice.',
      content: (
        <div className="space-y-3">
          <Textarea
            value={banking}
            onChange={(e) => setBanking(e.target.value)}
            placeholder="Bank Name: First National Bank&#10;Account Name: My Company&#10;Account Number: 123456789&#10;Branch Code: 250655&#10;Reference: Invoice Number"
            rows={5}
          />
          <Button size="sm" onClick={handleSaveSettings}>Save Banking Details</Button>
        </div>
      ),
    },
    {
      icon: Scale,
      title: 'Terms & Conditions',
      description: 'Default terms shown at the bottom of every invoice.',
      content: (
        <div className="space-y-3">
          <Textarea
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            placeholder="1. Payment is due within 30 days of invoice date.&#10;2. Late payments will incur a 2% monthly interest charge.&#10;3. All prices are inclusive of VAT unless stated otherwise."
            rows={5}
          />
          <Button size="sm" onClick={handleSaveSettings}>Save Terms & Conditions</Button>
        </div>
      ),
    },
    {
      icon: FileText,
      title: 'Branding Themes & Invoice Settings',
      description: 'Control how your invoices, quotes, and statements look in PDFs and online views.',
      content: (
        <Link
          to="/settings/invoice"
          className="inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
        >
          Open Invoice Settings <ChevronRight className="h-4 w-4" />
        </Link>
      ),
    },
    {
      icon: Users,
      title: 'Team Members',
      description: 'Invite team members by email, assign roles, and manage access.',
      content: (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Email address"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              className="h-9 flex-1"
            />
            <Select value={inviteRole} onValueChange={setInviteRole}>
              <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleInvite}><Plus className="mr-1 h-3 w-3" /> Invite</Button>
          </div>

          {members.length > 0 && (
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Current Members</Label>
              <div className="space-y-2">
                {members.map(m => (
                  <div key={m.userId} className="flex items-center justify-between rounded-lg border px-4 py-2.5">
                    <span className="text-sm font-medium">{m.displayName}</span>
                    <Badge variant="outline" className="capitalize">{m.role}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {invites.length > 0 && (
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Pending Invites</Label>
              <div className="space-y-2">
                {invites.filter(i => i.status === 'pending').map(i => (
                  <div key={i.id} className="flex items-center justify-between rounded-lg border px-4 py-2.5">
                    <div>
                      <span className="text-sm font-medium">{i.email}</span>
                      <span className="text-xs text-muted-foreground ml-2">({i.role})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Pending</Badge>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteInvite(i.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      icon: Shield,
      title: 'Permission Matrix',
      description: 'What each role can do',
      content: (() => {
        const rows = [
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
        return (
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
                {rows.map(([action, admin, staff, viewer], idx) => (
                  <tr key={action} className={idx % 2 === 1 ? 'bg-muted/10' : ''}>
                    <td className="px-4 py-2 text-sm">{action}</td>
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
        );
      })(),
    },
    {
      icon: Bell,
      title: 'Overdue Reminders',
      description: 'Automatically send email reminders when invoices are past due.',
      content: (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch checked={remindersEnabled} onCheckedChange={setRemindersEnabled} />
            <span className="text-sm">{remindersEnabled ? 'Reminders enabled' : 'Reminders disabled'}</span>
          </div>
          {remindersEnabled && (
            <div className="space-y-2">
              <Label className="text-xs">Days after due date (comma-separated)</Label>
              <Input
                value={reminderDays}
                onChange={e => setReminderDays(e.target.value)}
                placeholder="1, 7, 14, 30"
                className="h-9 w-64"
              />
              <p className="text-[11px] text-muted-foreground">E.g. "1,7,14,30" means reminders at 1, 7, 14, and 30 days overdue.</p>
            </div>
          )}
          <Button size="sm" onClick={handleSaveReminders}>Save Reminder Settings</Button>
        </div>
      ),
    },
    {
      icon: CreditCard,
      title: 'Payment Settings',
      description: 'Connect a payment provider to accept online payments.',
      content: (
        <p className="text-sm text-muted-foreground">Coming soon — connect Stripe, PayFast, or other providers.</p>
      ),
    },
  ];

  if (!permissions.loading && !permissions.canAccessSettings) {
    return <Navigate to="/" replace />;
  }

  return (
    <AppLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your account, branding, and preferences.
          </p>
        </div>
        <Button onClick={handleSaveSettings}>Save Settings</Button>
      </div>

      <div className="space-y-4">
        {sections.map((s) => (
          <div key={s.title} className="rounded-lg border bg-card p-6 invoice-shadow">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted shrink-0">
                <s.icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium">{s.title}</h3>
                <p className="text-sm text-muted-foreground mt-0.5 mb-3">{s.description}</p>
                {s.content}
              </div>
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
