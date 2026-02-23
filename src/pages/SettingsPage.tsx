import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Palette, FileText, Shield, CreditCard, Landmark, Scale, Sun, Moon, ChevronRight } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { useTheme, colorThemes } from '@/hooks/useTheme';
import { useGlobalSettings } from '@/hooks/useGlobalSettings';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { theme, toggleTheme, colorTheme, setColorTheme } = useTheme();
  const { settings, saveSettings } = useGlobalSettings();
  const [banking, setBanking] = useState('');
  const [terms, setTerms] = useState('');

  useEffect(() => {
    if (settings) {
      setBanking(settings.bankingDetails);
      setTerms(settings.termsConditions);
    }
  }, [settings]);

  const handleSaveSettings = async () => {
    const ok = await saveSettings(banking, terms);
    if (ok) toast.success('Settings saved');
    else toast.error('Failed to save');
  };

  const sections = [
    {
      icon: Palette,
      title: 'Theme & Appearance',
      description: 'Choose a vibe that matches your brand personality.',
      content: (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={toggleTheme} className="gap-2">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              Switch to {theme === 'dark' ? 'Light' : 'Dark'}
            </Button>
          </div>
          <div>
            <Label className="text-xs mb-3 block">Choose Your Vibe</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              {colorThemes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setColorTheme(t.id)}
                  className={`relative flex items-start gap-3 rounded-lg border p-4 text-left transition-all ${
                    colorTheme === t.id
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border bg-card hover:border-primary/30 hover:bg-accent/30'
                  }`}
                >
                  <div
                    className="mt-0.5 h-5 w-5 shrink-0 rounded-full ring-2 ring-offset-2 ring-offset-background"
                    style={{
                      backgroundColor: `hsl(${t.accent})`,
                      boxShadow: colorTheme === t.id ? `0 0 0 2px hsl(${t.accent})` : undefined,
                    }}
                  />
                  <div>
                    <span className="text-sm font-medium">{t.label}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.vibe}</p>
                  </div>
                </button>
              ))}
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
