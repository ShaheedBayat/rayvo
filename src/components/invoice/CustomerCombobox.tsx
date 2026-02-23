import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Customer } from '@/hooks/useCustomers';

interface Props {
  customers: Customer[];
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  onSelect: (customer: { name: string; email: string; address: string; taxRate?: number; currency?: string; dueDays?: number }) => void;
  onNameChange: (name: string) => void;
  onEmailChange: (email: string) => void;
  onAddressChange: (address: string) => void;
}

export default function CustomerCombobox({ customers, clientName, clientEmail, clientAddress, onSelect, onNameChange, onEmailChange, onAddressChange }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes((search || clientName).toLowerCase())
  ).slice(0, 8);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (c: Customer) => {
    const address = [c.billingStreet, c.billingSuburb, c.billingCity, c.billingProvince, c.billingPostalCode, c.billingCountry]
      .filter(Boolean).join(', ');
    onSelect({
      name: c.name,
      email: c.email,
      address: address || c.address,
      taxRate: c.defaultTaxRate,
      currency: c.currency,
      dueDays: c.defaultDueDays,
    });
    setOpen(false);
    setSearch('');
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5 relative" ref={ref}>
        <Label className="text-xs">Customer Name</Label>
        <Input
          required
          value={clientName}
          onChange={(e) => { onNameChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search or type customer name"
          className="h-9"
          autoComplete="off"
        />
        {open && filtered.length > 0 && (
          <div className="absolute z-50 top-full mt-1 w-full rounded-md border bg-popover shadow-md max-h-48 overflow-y-auto">
            {filtered.map(c => (
              <button
                key={c.id}
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                onClick={() => handleSelect(c)}
              >
                <span className="font-medium">{c.name}</span>
                {c.email && <span className="text-muted-foreground ml-2 text-xs">{c.email}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Email</Label>
        <Input type="email" value={clientEmail} onChange={(e) => onEmailChange(e.target.value)} placeholder="client@example.com" className="h-9" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Address</Label>
        <Textarea value={clientAddress} onChange={(e) => onAddressChange(e.target.value)} placeholder="Street, city, postal code" rows={3} />
      </div>
    </div>
  );
}
