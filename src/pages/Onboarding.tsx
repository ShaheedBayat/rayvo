import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Building2, ArrowRight } from 'lucide-react';

const currencies = ['ZAR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'INR', 'NGN', 'KES'];

export default function Onboarding() {
  const { user } = useAuth();
  const { refetchCompanies } = useActiveCompany();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [isVatRegistered, setIsVatRegistered] = useState(false);
  const [currency, setCurrency] = useState('ZAR');

  const handleCreate = async () => {
    if (!user) return;
    if (!name.trim()) {
      toast.error('Company name is required');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.from('companies').insert({
        name: name.trim(),
        email: email.trim() || user.email || '',
        address: '',
        city: '',
        country: 'South Africa',
        owner_id: user.id,
        is_vat_registered: isVatRegistered,
        vat_rate: isVatRegistered ? 15 : 0,
        pricing_mode: isVatRegistered ? 'exclusive' : 'inclusive',
      }).select('id').single();

      if (error) throw error;

      // Link user as admin
      await supabase.from('company_users').insert({
        company_id: data.id,
        user_id: user.id,
        role: 'admin',
      });

      localStorage.setItem('activeCompanyId', data.id);
      await refetchCompanies();
      toast.success('Company created successfully');
      navigate('/', { replace: true });
    } catch (err: any) {
      toast.error(err.message || 'Failed to create company');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome</h1>
          <p className="text-muted-foreground text-sm">Set up your company to get started</p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Create a Company</CardTitle>
            <CardDescription>This will be your billing entity for invoices and quotes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">Company Name *</Label>
              <Input
                id="company-name"
                placeholder="e.g. Acme Solutions"
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company-email">Company Email</Label>
              <Input
                id="company-email"
                type="email"
                placeholder="billing@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="vat-toggle" className="text-sm font-medium">VAT Registered</Label>
                <p className="text-xs text-muted-foreground">Enable if your company is VAT registered</p>
              </div>
              <Switch
                id="vat-toggle"
                checked={isVatRegistered}
                onCheckedChange={setIsVatRegistered}
              />
            </div>

            <Button
              className="w-full"
              onClick={handleCreate}
              disabled={submitting || !name.trim()}
            >
              {submitting ? 'Creating…' : 'Create Company'}
              {!submitting && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
