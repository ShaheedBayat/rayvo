import { Settings, Palette, FileText, Shield, CreditCard } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();

  const sections = [
    {
      icon: Palette,
      title: 'Theme & Appearance',
      description: 'Choose your preferred colour scheme and mode.',
      content: (
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Current: {theme === 'dark' ? 'Dark' : 'Light'}</span>
          <Button variant="outline" size="sm" onClick={toggleTheme}>
            Switch to {theme === 'dark' ? 'Light' : 'Dark'}
          </Button>
        </div>
      ),
    },
    {
      icon: FileText,
      title: 'Invoice Templates',
      description: 'Choose from Modern, Classic, or Minimal PDF styles.',
      content: (
        <p className="text-sm text-muted-foreground">Coming soon — select a template style for your invoice PDFs.</p>
      ),
    },
    {
      icon: Shield,
      title: 'Users & Permissions',
      description: 'Manage team members, roles, and access controls.',
      content: (
        <p className="text-sm text-muted-foreground">Coming soon — invite users and assign roles like Owner, Admin, Finance, or Viewer.</p>
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

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account, branding, and preferences.
        </p>
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
