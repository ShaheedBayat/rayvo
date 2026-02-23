import { CreditCard, Zap, Shield, ArrowRight, CheckCircle2, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import AppLayout from '@/components/AppLayout';

const providers = [
  {
    name: 'Stripe',
    description: 'Accept credit cards, debit cards, and digital wallets worldwide.',
    fees: '2.9% + 30¢ per transaction',
    connected: false,
    logo: '💳',
  },
  {
    name: 'PayFast',
    description: 'South Africa\'s leading payment gateway. Accept EFT, credit cards, and more.',
    fees: '3.5% + R2.00 per transaction',
    connected: false,
    logo: '🇿🇦',
  },
  {
    name: 'PayPal',
    description: 'Accept PayPal payments from customers around the world.',
    fees: '2.9% + fixed fee per transaction',
    connected: false,
    logo: '🅿️',
  },
  {
    name: 'Yoco',
    description: 'South African payment solution for card and online payments.',
    fees: '2.95% per transaction',
    connected: false,
    logo: '💚',
  },
];

const steps = [
  { title: 'Connect a provider', description: 'Link your Stripe, PayFast, or PayPal account.' },
  { title: 'Enable "Pay Now"', description: 'A payment button is added to your invoices automatically.' },
  { title: 'Customer pays online', description: 'They click Pay Now and complete payment securely.' },
  { title: 'Invoice auto-updates', description: 'Payment is recorded and the invoice marked as paid.' },
];

export default function OnlinePayments() {
  return (
    <AppLayout>
      {/* Hero Section */}
      <div className="rounded-xl border border-border/50 bg-card p-8 md:p-12 invoice-shadow mb-8">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-semibold mb-3">Accept online payments and get paid faster</h1>
          <p className="text-muted-foreground text-base mb-6 max-w-lg">
            Connect a payment provider and add a "Pay Now" button to your invoices. Customers pay online and invoices are automatically marked as paid.
          </p>
          <Button size="lg" className="gap-2 rounded-lg">
            <Zap className="h-4 w-4" />
            Connect Payment Provider
          </Button>
        </div>
      </div>

      {/* How It Works */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">How it works</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <div key={i} className="rounded-xl border border-border/50 bg-card p-5 invoice-shadow">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold mb-3">
                {i + 1}
              </div>
              <h3 className="text-sm font-semibold mb-1">{step.title}</h3>
              <p className="text-xs text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Providers */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Payment Providers</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {providers.map((provider) => (
            <div key={provider.name} className="rounded-xl border border-border/50 bg-card p-5 invoice-shadow hover:invoice-shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{provider.logo}</span>
                  <div>
                    <h3 className="text-sm font-semibold">{provider.name}</h3>
                    <p className="text-xs text-muted-foreground">{provider.fees}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {provider.connected ? (
                    <span className="flex items-center gap-1 text-xs text-success font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Connected
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Circle className="h-3.5 w-3.5" /> Not connected
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-4">{provider.description}</p>
              <Button variant="outline" size="sm" className="w-full rounded-lg gap-1.5">
                {provider.connected ? 'Settings' : 'Connect'}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Settings */}
      <div className="rounded-xl border border-border/50 bg-card p-6 invoice-shadow">
        <h2 className="text-lg font-semibold mb-5">Payment Settings</h2>
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Enable "Pay Now" button on invoices</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Add a payment button to all sent invoices</p>
            </div>
            <Switch />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Allow partial payments</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Let customers pay a portion of the invoice</p>
            </div>
            <Switch />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Auto-mark invoices as paid</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Automatically update invoice status when payment is received</p>
            </div>
            <Switch defaultChecked />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
