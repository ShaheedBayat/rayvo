import { useState, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useCompanies } from '@/hooks/useInvoiceStore';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import type { Company, PricingMode } from '@/types/invoice';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Plus, Trash2, Pencil, Upload, Search, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

function CompanyForm({
  initial,
  onSave,
  onClose,
}: {
  initial?: Company;
  onSave: (c: Company) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [email, setEmail] = useState(initial?.email || '');
  const [phone, setPhone] = useState(initial?.phone || '');
  const [address, setAddress] = useState(initial?.address || '');
  const [city, setCity] = useState(initial?.city || '');
  const [country, setCountry] = useState(initial?.country || '');
  const [taxNumber, setTaxNumber] = useState(initial?.taxNumber || '');
  const [logo, setLogo] = useState(initial?.logo || '');
  const [isVatRegistered, setIsVatRegistered] = useState(initial?.isVatRegistered ?? false);
  const [vatRate, setVatRate] = useState(initial?.vatRate?.toString() ?? '15');
  const [pricingMode, setPricingMode] = useState<PricingMode>(initial?.pricingMode || 'exclusive');

  const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isVatRegistered && !taxNumber.trim()) {
      return; // VAT number required
    }
    onSave({
      id: initial?.id || uuidv4(),
      name, email, phone, address, city, country, taxNumber, logo,
      isVatRegistered,
      vatRate: parseFloat(vatRate) || 15,
      pricingMode,
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
          <Label>Company Name</Label>
          <Input required value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Phone</Label>
          <Input value={phone} onChange={e => setPhone(e.target.value)} />
        </div>
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
      <div className="space-y-4 pt-2">
        <div className="flex items-start gap-3">
          <Checkbox checked={isVatRegistered} onCheckedChange={(v) => setIsVatRegistered(!!v)} id="vat-reg" className="mt-0.5" />
          <div>
            <Label htmlFor="vat-reg" className="text-sm font-semibold cursor-pointer">VAT Registered</Label>
            <p className="text-sm text-muted-foreground mt-0.5">Enable this if the company is registered for VAT. Tax fields will be shown on invoices and products.</p>
          </div>
        </div>
        {isVatRegistered && (
          <div className="grid gap-4 sm:grid-cols-2 ml-7">
            <div className="space-y-1.5">
              <Label>VAT / Tax Number <span className="text-destructive">*</span></Label>
              <Input required value={taxNumber} onChange={e => setTaxNumber(e.target.value)} placeholder="e.g. 4123456789" />
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
              <p className="text-xs text-muted-foreground mt-0.5">
                {pricingMode === 'inclusive' ? 'Line item prices include VAT. VAT will be reverse-calculated.' : 'VAT will be added on top of line item prices.'}
              </p>
            </div>
          </div>
        )}
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="submit">{initial ? 'Update' : 'Add'} Company</Button>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  );
}

export default function Companies() {
  const { companies, addCompany, updateCompany, deleteCompany } = useCompanies();
  const { refetchCompanies } = useActiveCompany();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Company | undefined>();
  const [search, setSearch] = useState('');

  // Get last used company from localStorage
  const lastUsedId = localStorage.getItem('lastUsedCompanyId');
  const lastUsedCompany = companies.find(c => c.id === lastUsedId);

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
    if (editing?.id) {
      await updateCompany(c);
      toast.success('Company updated');
    } else {
      const success = await addCompany(c);
      if (success) {
        toast.success('Company added');
      } else {
        toast.error('Failed to add company. Please make sure you are logged in.');
        return;
      }
    }
    localStorage.setItem('lastUsedCompanyId', c.id);
    setEditing(undefined);
    refetchCompanies();
  };

  const handleEdit = (c: Company) => {
    setEditing(c);
    setOpen(true);
  };

  const handleAddNew = () => {
    setEditing(undefined);
    setOpen(true);
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
        <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) setEditing(undefined); }}>
          <DialogTrigger asChild>
            <Button onClick={handleAddNew}>
              <Plus className="mr-1.5 h-4 w-4" /> Add Company
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing?.id ? 'Edit' : 'Add'} Company</DialogTitle>
            </DialogHeader>
            <CompanyForm
              initial={editing}
              onSave={handleSave}
              onClose={() => { setOpen(false); setEditing(undefined); }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search bar - always visible when companies exist */}
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

      {/* Recently used company */}
      {lastUsedCompany && companies.length > 1 && !search && (
        <div className="mb-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Clock className="h-3.5 w-3.5" />
            Recently Used
          </div>
          <div
            className="rounded-lg border border-primary/20 bg-accent/30 p-4 cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => handleEdit(lastUsedCompany)}
          >
            <div className="flex items-center gap-3">
              {lastUsedCompany.logo ? (
                <img src={lastUsedCompany.logo} alt={lastUsedCompany.name} className="h-8 w-8 rounded object-contain" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
              )}
              <div>
                <span className="text-sm font-medium">{lastUsedCompany.name}</span>
                <p className="text-xs text-muted-foreground">{lastUsedCompany.email}</p>
              </div>
            </div>
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(c => (
            <div key={c.id} className="rounded-lg border bg-card p-5 invoice-shadow group">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {c.logo ? (
                    <img src={c.logo} alt={c.name} className="h-10 w-10 rounded object-contain" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded bg-accent">
                      <Building2 className="h-5 w-5 text-accent-foreground" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-medium">{c.name}</h3>
                    <p className="text-xs text-muted-foreground">{c.email}</p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(c)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => { deleteCompany(c.id); toast.success('Company deleted'); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="mt-3 text-sm text-muted-foreground">
                <p>{c.address}</p>
                <p>{c.city}, {c.country}</p>
                {c.taxNumber && <p className="mono text-xs mt-1">Tax: {c.taxNumber}</p>}
              </div>
            </div>
          ))}
          {filtered.length === 0 && search && (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              No companies matching "{search}"
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}
