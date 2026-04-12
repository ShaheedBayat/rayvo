import { CreditCard, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/components/AppLayout';
import { useState } from 'react';
import { toast } from 'sonner';

const providers = [
  { name: 'Stripe', description: 'Credit cards, debit cards, and digital wallets worldwide.', logo: '💳' },
  { name: 'PayFast', description: "South Africa's leading payment gateway. EFT, cards, and more.", logo: '🇿🇦' },
  { name: 'PayPal', description: 'Accept PayPal payments from customers globally.', logo: '🅿️' },
  { name: 'Yoco', description: 'South African payment solution for card and online payments.', logo: '💚' },
];

export default function OnlinePayments() {
  const [email, setEmail] = useState('');

  const handleNotify = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("We'll let you know!");
    setEmail('');
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto py-4">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <CreditCard className="h-6 w-6 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-semibold mb-2">Online Payments — Coming Soon</h1>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">
            Connect a payment gateway to let clients pay invoices directly online. We're working on integrations — you'll be notified when they're ready.
          </p>
        </div>

        {/* Provider cards */}
        <div className="grid gap-4 sm:grid-cols-2 mb-10">
          {providers.map((p) => (
            <div
              key={p.name}
              className="relative rounded-xl border border-border/50 bg-card p-5 opacity-50 grayscale pointer-events-none select-none"
            >
              <Badge variant="secondary" className="absolute top-3 right-3 text-[10px]">Coming Soon</Badge>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{p.logo}</span>
                <h3 className="text-sm font-semibold">{p.name}</h3>
              </div>
              <p className="text-xs text-muted-foreground">{p.description}</p>
            </div>
          ))}
        </div>

        {/* Notify me */}
        <div className="rounded-xl border border-border/50 bg-card p-6 text-center">
          <Bell className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium mb-1">Get notified when it's ready</p>
          <p className="text-xs text-muted-foreground mb-4">Enter your email and we'll let you know as soon as online payments go live.</p>
          <form onSubmit={handleNotify} className="flex gap-2 max-w-sm mx-auto">
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="text-sm"
            />
            <Button type="submit" size="sm">Notify Me</Button>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
