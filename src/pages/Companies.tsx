import { useState, useMemo, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { useCompanies } from '@/hooks/useInvoiceStore';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import type { Company, PricingMode, Currency } from '@/types/invoice';
import { currencyLabels } from '@/types/invoice';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Plus, Trash2, Upload, Search, Clock, Save, X, ChevronDown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

function CompanyEditPanel({
  initial,
  onSave,
  onCancel,
}: {
  initial: Company;
  onSave: (c: Company) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial.name || '');
  const [email, setEmail] = useState(initial.email || '');
  const [phone, setPhone] = useState(initial.phone || '');
  const [address, setAddress] = useState(initial.address || '');
  const [city, setCity] = useState(initial.city || '');
  const [country, setCountry] = useState(initial.country || '');
  const [taxNumber, setTaxNumber] = useState(initial.taxNumber || '');
  const [logo, setLogo] = useState(initial.logo || '');
  const [isVatRegistered, setIsVatRegistered] = useState(initial.isVatRegistered ?? false);
  const [vatRate, setVatRate] = useState(initial.vatRate?.toString() ?? '15');
  const [pricingMode, setPricingMode] = useState<PricingMode>(initial.pricingMode || 'exclusive');
  const [defaultCurrency, setDefaultCurrency] = useState<Currency>(initial.defaultCurrency || 'ZAR');

  const [uploading, setUploading] = useState(false);

  const handleLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be under 2MB');
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `${initial.id}/${uuidv4()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage
        .from('company-logos')
        .getPublicUrl(path);
      setLogo(urlData.publicUrl);
      toast.success('Logo uploaded');
    } catch (err: any) {
      toast.error('Failed to upload logo: ' + (err.message || 'Unknown error'));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isVatRegistered && !taxNumber.trim()) return;
    onSave({
      id: initial.id,
      name, email, phone, address, city, country, taxNumber, logo,
      isVatRegistered,
      vatRate: parseFloat(vatRate) || 15,
      pricingMode,
      defaultCurrency,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Edit Company</h2>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" size="sm">
            <Save className="mr-1.5 h-3.5 w-3.5" /> Save
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border-2 border-dashed bg-secondary overflow-hidden">
          {logo ? (
            <img src={logo} alt="Logo" className="h-full w-full object-contain" />
          ) : (
            <Upload className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1">
          <Label>Company Name <span className="text-destructive">*</span></Label>
          <Input required value={name} onChange={e => setName(e.target.value)} className="mt-1" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Registration Number</Label>
          <Input value={taxNumber} onChange={e => setTaxNumber(e.target.value)} placeholder="e.g. 2017/654029/07" />
        </div>
        <div className="space-y-1.5">
          <Label>VAT Number</Label>
          <Input value={taxNumber} onChange={e => setTaxNumber(e.target.value)} placeholder="e.g. 4160281400" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Phone</Label>
          <Input value={phone} onChange={e => setPhone(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Website</Label>
          <Input placeholder="https://" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Address</Label>
          <Input required value={address} onChange={e => setAddress(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>City</Label>
          <Input required value={city} onChange={e => setCity(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Country</Label>
          <Input required value={country} onChange={e => setCountry(e.target.value)} />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Label className="cursor-pointer text-sm text-primary hover:underline">
          Upload Logo
          <input type="file" accept="image/*" className="hidden" onChange={handleLogo} />
        </Label>
        <p className="text-xs text-muted-foreground">PNG or JPG, max 2MB</p>
      </div>

      <div className="space-y-1.5">
        <Label>Default Currency</Label>
        <Select value={defaultCurrency} onValueChange={(v) => setDefaultCurrency(v as Currency)}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(currencyLabels).map(([code, label]) => (
              <SelectItem key={code} value={code}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4 pt-2">
        <div className="flex items-start gap-3">
          <Checkbox checked={isVatRegistered} onCheckedChange={(v) => setIsVatRegistered(!!v)} id={`vat-reg-${initial.id}`} className="mt-0.5" />
          <div>
            <Label htmlFor={`vat-reg-${initial.id}`} className="text-sm font-semibold cursor-pointer">VAT Registered</Label>
            <p className="text-sm text-muted-foreground mt-0.5">Enable if the company is registered for VAT.</p>
          </div>
        </div>
        {isVatRegistered && (
          <div className="grid gap-4 sm:grid-cols-2 ml-7">
            <div className="space-y-1.5">
              <Label>Default VAT Rate (%)</Label>
              <Input type="number" min={0} max={100} step="0.5" value={vatRate} onChange={e => setVatRate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Pricing Mode</Label>
              <Select value={pricingMode} onValueChange={(v) => setPricingMode(v as PricingMode)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="exclusive">Prices are VAT Exclusive</SelectItem>
                  <SelectItem value="inclusive">Prices are VAT Inclusive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>
    </form>
  );
}

function CompanyCreateForm({
  onSave,
  onClose,
}: {
  onSave: (c: Company) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [logo, setLogo] = useState('');
  const [isVatRegistered, setIsVatRegistered] = useState(false);
  const [vatRate, setVatRate] = useState('15');
  const [pricingMode, setPricingMode] = useState<PricingMode>('exclusive');
  const [defaultCurrency, setDefaultCurrency] = useState<Currency>('ZAR');

  const [uploading, setUploading] = useState(false);
  const tempId = useMemo(() => uuidv4(), []);

  const handleLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be under 2MB');
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `${tempId}/${uuidv4()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage
        .from('company-logos')
        .getPublicUrl(path);
      setLogo(urlData.publicUrl);
      toast.success('Logo uploaded');
    } catch (err: any) {
      toast.error('Failed to upload logo: ' + (err.message || 'Unknown error'));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isVatRegistered && !taxNumber.trim()) return;
    onSave({
      id: uuidv4(),
      name, email, phone, address, city, country, taxNumber, logo,
      isVatRegistered,
      vatRate: parseFloat(vatRate) || 15,
      pricingMode,
      defaultCurrency,
    });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed bg-secondary overflow-hidden">
          {logo ? (
            <img src={logo} alt="Logo" className="h-full w-full object-contain" />
          ) : (
            <Upload className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div>
          <Label className="cursor-pointer text-sm text-primary hover:underline">
            Upload Logo
            <input type="file" accept="image/*" className="hidden" onChange={handleLogo} />
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">PNG or JPG, max 2MB</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Company Name <span className="text-destructive">*</span></Label>
          <Input required value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Email <span className="text-destructive">*</span></Label>
          <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Phone</Label>
          <Input value={phone} onChange={e => setPhone(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Address <span className="text-destructive">*</span></Label>
          <Input required value={address} onChange={e => setAddress(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>City <span className="text-destructive">*</span></Label>
          <Input required value={city} onChange={e => setCity(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Country <span className="text-destructive">*</span></Label>
          <Input required value={country} onChange={e => setCountry(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Default Currency</Label>
        <Select value={defaultCurrency} onValueChange={(v) => setDefaultCurrency(v as Currency)}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(currencyLabels).map(([code, label]) => (
              <SelectItem key={code} value={code}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-4 pt-2">
        <div className="flex items-start gap-3">
          <Checkbox checked={isVatRegistered} onCheckedChange={(v) => setIsVatRegistered(!!v)} id="vat-reg-new" className="mt-0.5" />
          <div>
            <Label htmlFor="vat-reg-new" className="text-sm font-semibold cursor-pointer">VAT Registered</Label>
            <p className="text-sm text-muted-foreground mt-0.5">Enable if registered for VAT.</p>
          </div>
        </div>
        {isVatRegistered && (
          <div className="grid gap-4 sm:grid-cols-2 ml-7">
            <div className="space-y-1.5">
              <Label>VAT / Tax Number <span className="text-destructive">*</span></Label>
              <Input required value={taxNumber} onChange={e => setTaxNumber(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Default VAT Rate (%)</Label>
              <Input type="number" min={0} max={100} step="0.5" value={vatRate} onChange={e => setVatRate(e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Pricing Mode</Label>
              <Select value={pricingMode} onValueChange={(v) => setPricingMode(v as PricingMode)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="exclusive">Prices are VAT Exclusive</SelectItem>
                  <SelectItem value="inclusive">Prices are VAT Inclusive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="submit">Add Company</Button>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  );
}

export default function Companies() {
  const { companies, addCompany, updateCompany, deleteCompany } = useCompanies();
  const { refetchCompanies } = useActiveCompany();
  const [createOpen, setCreateOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return companies;
    const q = search.toLowerCase();
    return companies.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.city.toLowerCase().includes(q)
    );
  }, [companies, search]);

  const handleSave = async (c: Company) => {
    await updateCompany(c);
    toast.success('Company updated');
    localStorage.setItem('lastUsedCompanyId', c.id);
    setExpandedId(null);
    refetchCompanies();
  };

  const handleCreate = async (c: Company) => {
    const success = await addCompany(c);
    if (success) {
      toast.success('Company added');
      localStorage.setItem('lastUsedCompanyId', c.id);
      refetchCompanies();
    } else {
      toast.error('Failed to add company.');
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Companies</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your companies and billing details.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-1.5 h-4 w-4" /> Add Company</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Company</DialogTitle>
            </DialogHeader>
            <CompanyCreateForm
              onSave={handleCreate}
              onClose={() => setCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {companies.length > 0 && (
        <div className="mb-4 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search companies..."
              className="pl-9 h-9"
            />
          </div>
        </div>
      )}

      {companies.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20">
          <Building2 className="h-10 w-10 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">No companies yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add a company to start creating invoices.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-3">
          {filtered.map(c => {
            const isExpanded = expandedId === c.id;
            return (
              <div
                key={c.id}
                className={cn(
                  "rounded-lg border bg-card overflow-hidden transition-all",
                  isExpanded && "md:col-span-3 ring-1 ring-primary/20"
                )}
              >
                <div
                  className="flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-accent/30 transition-colors"
                  onClick={() => toggleExpand(c.id)}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {c.logo ? (
                      <img src={c.logo} alt={c.name} className="h-8 w-8 rounded object-contain shrink-0" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-accent shrink-0">
                        <Building2 className="h-4 w-4 text-accent-foreground" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="text-sm font-medium truncate">{c.name}</h3>
                      <p className="text-[11px] text-muted-foreground truncate">{c.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget({ id: c.id, name: c.name });
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    <ChevronDown className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform",
                      isExpanded && "rotate-180"
                    )} />
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t bg-muted/20">
                    <CompanyEditPanel
                      initial={c}
                      onSave={handleSave}
                      onCancel={() => setExpandedId(null)}
                    />
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && search && (
            <div className="py-12 text-center text-muted-foreground">
              No companies matching "{search}"
            </div>
          )}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All company data including settings will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async (e) => {
                e.preventDefault();
                if (!deleteTarget) return;
                setDeleting(true);
                const result = await deleteCompany(deleteTarget.id);
                setDeleting(false);
                if (result.success) {
                  toast.success('Company deleted');
                  refetchCompanies();
                  setDeleteTarget(null);
                } else {
                  toast.error(result.error || 'Failed to delete company');
                }
              }}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
