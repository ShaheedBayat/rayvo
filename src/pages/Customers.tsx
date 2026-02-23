import { useState } from 'react';
import { Users, Plus, Search, Building2, User, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/components/AppLayout';
import { useCustomers, type Customer } from '@/hooks/useCustomers';
import { toast } from 'sonner';

function AddCustomerDialog({ open, onOpenChange, onAdd }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdd: (c: Omit<Customer, 'createdAt'>) => Promise<any>;
}) {
  const [type, setType] = useState<'individual' | 'company'>('individual');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [vatNumber, setVatNumber] = useState('');

  const reset = () => {
    setType('individual'); setName(''); setEmail(''); setPhone('');
    setAddress(''); setCity(''); setCountry('');
    setIdNumber(''); setRegNumber(''); setVatNumber('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Name is required'); return; }
    if (type === 'individual' && !idNumber.trim()) { toast.error('ID number is required for individuals'); return; }
    if (type === 'company') {
      if (!regNumber.trim()) { toast.error('Registration number is required'); return; }
      if (!vatNumber.trim()) { toast.error('VAT number is required'); return; }
      if (!address.trim()) { toast.error('Company address is required'); return; }
    }

    const error = await onAdd({
      id: uuidv4(),
      type,
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      address: address.trim(),
      city: city.trim(),
      country: country.trim(),
      idNumber: idNumber.trim(),
      registrationNumber: regNumber.trim(),
      vatNumber: vatNumber.trim(),
    });
    if (!error) {
      toast.success('Customer added!');
      reset();
      onOpenChange(false);
    } else {
      toast.error('Failed to add customer');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Customer</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Customer Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as 'individual' | 'company')}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">
                  <span className="flex items-center gap-2"><User className="h-3.5 w-3.5" /> Individual</span>
                </SelectItem>
                <SelectItem value="company">
                  <span className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5" /> Company</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">{type === 'company' ? 'Company Name' : 'Full Name'} *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={type === 'company' ? 'Acme Inc.' : 'John Doe'} className="h-9" required />
          </div>

          {type === 'individual' && (
            <div className="space-y-1.5">
              <Label className="text-xs">ID Number *</Label>
              <Input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="National ID number" className="h-9" required />
            </div>
          )}

          {type === 'company' && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Registration Number *</Label>
                  <Input value={regNumber} onChange={(e) => setRegNumber(e.target.value)} placeholder="Company reg number" className="h-9" required />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">VAT Number *</Label>
                  <Input value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} placeholder="VAT number" className="h-9" required />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Company Address *</Label>
                <Textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, building, suite" rows={2} required />
              </div>
            </>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+27..." className="h-9" />
            </div>
          </div>

          {type === 'individual' && (
            <div className="space-y-1.5">
              <Label className="text-xs">Address</Label>
              <Textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, city, postal code" rows={2} />
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">City</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Country</Label>
              <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country" className="h-9" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">Add Customer</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Customers() {
  const { customers, loading, addCustomer, deleteCustomer } = useCustomers();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Customers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your customers and track outstanding payments.
          </p>
        </div>
        <Button className="gap-1.5" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          New Customer
        </Button>
      </div>

      <AddCustomerDialog open={dialogOpen} onOpenChange={setDialogOpen} onAdd={addCustomer} />

      {loading ? (
        <div className="flex justify-center py-20 text-muted-foreground">Loading...</div>
      ) : customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20">
          <Users className="h-10 w-10 text-muted-foreground/40" />
          <h3 className="mt-4 text-lg font-medium">No customers yet</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm text-center">
            Add your first customer to start managing contacts, invoice history, and outstanding balances.
          </p>
          <Button className="mt-6 gap-1.5" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Add your first customer
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search customers..."
                className="pl-9 h-9"
              />
            </div>
          </div>

          <div className="rounded-lg border bg-card invoice-shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="py-3 px-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Name</th>
                  <th className="py-3 px-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Type</th>
                  <th className="py-3 px-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</th>
                  <th className="py-3 px-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Phone</th>
                  <th className="py-3 px-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">ID / Reg No.</th>
                  <th className="py-3 px-4 w-12" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4 font-medium">{c.name}</td>
                    <td className="py-3 px-4">
                      <Badge variant="secondary" className="capitalize text-[11px]">
                        {c.type === 'individual' ? <User className="h-3 w-3 mr-1" /> : <Building2 className="h-3 w-3 mr-1" />}
                        {c.type}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{c.email || '—'}</td>
                    <td className="py-3 px-4 text-muted-foreground">{c.phone || '—'}</td>
                    <td className="py-3 px-4 mono text-xs text-muted-foreground">
                      {c.type === 'individual' ? c.idNumber : c.registrationNumber}
                    </td>
                    <td className="py-3 px-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => { deleteCustomer(c.id); toast.success('Customer deleted'); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AppLayout>
  );
}
