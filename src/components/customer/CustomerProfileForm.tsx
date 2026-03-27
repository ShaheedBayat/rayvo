import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  User, Building2, Globe, FileText, MapPin, CreditCard,
  Settings2, Shield, Tag, Plus, Trash2, ChevronDown, Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import type { Customer, CustomerContact } from '@/hooks/useCustomers';

interface CustomerProfileFormProps {
  initial?: Customer;
  onSave: (customer: Omit<Customer, 'createdAt'>) => Promise<any>;
  onCancel: () => void;
  onSaveAndCreateInvoice?: (customer: Omit<Customer, 'createdAt'>) => void;
}

const emptyContact = (): CustomerContact => ({
  id: uuidv4(),
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  role: '',
  isPrimary: false,
});

const defaultCustomer = (): Omit<Customer, 'createdAt'> => ({
  id: uuidv4(),
  type: 'individual',
  name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  country: '',
  idNumber: '',
  registrationNumber: '',
  vatNumber: '',
  taxIdNumber: '',
  website: '',
  notes: '',
  industry: '',
  billingStreet: '',
  billingSuburb: '',
  billingCity: '',
  billingProvince: '',
  billingPostalCode: '',
  billingCountry: 'South Africa',
  deliveryStreet: '',
  deliverySuburb: '',
  deliveryCity: '',
  deliveryProvince: '',
  deliveryPostalCode: '',
  deliveryCountry: '',
  deliverySameAsBilling: true,
  currency: 'ZAR',
  bankAccountName: '',
  bankAccountNumber: '',
  paymentReference: '',
  creditLimit: 0,
  blockOnCreditLimit: false,
  defaultDueDays: 30,
  defaultTaxRate: 15,
  defaultDiscount: 0,
  defaultLineAmounts: 'tax_inclusive',
  salesTaxOverride: '',
  taxExempt: false,
  accountNumber: '',
  tags: [],
  status: 'active',
  contacts: [{ ...emptyContact(), isPrimary: true }],
});

function SectionIcon({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <span className="flex items-center gap-2 text-sm font-semibold">
      <Icon className="h-4 w-4 text-primary" />
      {label}
    </span>
  );
}

function Field({ label, required, children, className = '' }: { label: string; required?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-xs text-muted-foreground">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

export default function CustomerProfileForm({ initial, onSave, onCancel, onSaveAndCreateInvoice }: CustomerProfileFormProps) {
  const [data, setData] = useState<Omit<Customer, 'createdAt'>>(() =>
    initial ? { ...initial, contacts: initial.contacts.length ? initial.contacts : [{ ...emptyContact(), isPrimary: true }] } : defaultCustomer()
  );
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const set = <K extends keyof Omit<Customer, 'createdAt'>>(key: K, value: Omit<Customer, 'createdAt'>[K]) =>
    setData(prev => ({ ...prev, [key]: value }));

  const isCompany = data.type === 'company';

  const updateContact = (index: number, field: keyof CustomerContact, value: any) => {
    setData(prev => {
      const contacts = [...prev.contacts];
      contacts[index] = { ...contacts[index], [field]: value };
      return { ...prev, contacts };
    });
  };

  const addContact = () => setData(prev => ({ ...prev, contacts: [...prev.contacts, emptyContact()] }));

  const removeContact = (index: number) => {
    setData(prev => {
      const contacts = prev.contacts.filter((_, i) => i !== index);
      if (contacts.length === 0) contacts.push({ ...emptyContact(), isPrimary: true });
      return { ...prev, contacts };
    });
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !data.tags.includes(tag)) {
      set('tags', [...data.tags, tag]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => set('tags', data.tags.filter(t => t !== tag));

  const isValid = () => {
    if (!data.name.trim()) return false;
    if (data.type === 'company' && (!data.registrationNumber.trim() || !data.vatNumber.trim())) return false;
    return true;
  };

  const handleSubmit = async () => {
    if (!isValid()) return;
    setSaving(true);
    const err = await onSave(data);
    setSaving(false);
    return err;
  };

  return (
    <div className="space-y-0">
      {/* Type Toggle */}
      <div className="flex items-center gap-2 pb-4">
        <Button
          type="button"
          variant={!isCompany ? 'default' : 'outline'}
          size="sm"
          className="gap-1.5"
          onClick={() => set('type', 'individual')}
        >
          <User className="h-3.5 w-3.5" /> Individual
        </Button>
        <Button
          type="button"
          variant={isCompany ? 'default' : 'outline'}
          size="sm"
          className="gap-1.5"
          onClick={() => set('type', 'company')}
        >
          <Building2 className="h-3.5 w-3.5" /> Company
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select value={data.status} onValueChange={v => set('status', v as 'active' | 'inactive')}>
            <SelectTrigger className="h-8 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Accordion type="multiple" defaultValue={['basic', 'contacts', 'addresses']} className="space-y-2">

        {/* === BASIC DETAILS === */}
        <AccordionItem value="basic" className="border rounded-lg px-4 bg-card">
          <AccordionTrigger className="py-3 hover:no-underline">
            <SectionIcon icon={isCompany ? Building2 : User} label="Basic Details" />
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={isCompany ? 'Company Name' : 'Full Name'} required>
                <Input value={data.name} onChange={e => set('name', e.target.value)} placeholder={isCompany ? 'Acme Inc.' : 'John Doe'} className="h-9" />
              </Field>
              {!isCompany && (
                <Field label="ID / Registration Number (optional)">
                  <Input value={data.idNumber} onChange={e => set('idNumber', e.target.value)} placeholder="National ID or Registration Number" className="h-9" />
                </Field>
              )}
              {isCompany && (
                <>
                  <Field label="Registration Number" required>
                    <Input value={data.registrationNumber} onChange={e => set('registrationNumber', e.target.value)} className="h-9" />
                  </Field>
                  <Field label="VAT Number" required>
                    <Input value={data.vatNumber} onChange={e => set('vatNumber', e.target.value)} className="h-9" />
                  </Field>
                </>
              )}
              <Field label="Tax ID Number">
                <Input value={data.taxIdNumber} onChange={e => set('taxIdNumber', e.target.value)} className="h-9" />
              </Field>
              <Field label="Email">
                <Input type="email" value={data.email} onChange={e => set('email', e.target.value)} placeholder="email@example.com" className="h-9" />
              </Field>
              <Field label="Phone">
                <Input value={data.phone} onChange={e => set('phone', e.target.value)} placeholder="+27..." className="h-9" />
              </Field>
              <Field label="Website">
                <Input value={data.website} onChange={e => set('website', e.target.value)} placeholder="https://" className="h-9" />
              </Field>
              {isCompany && (
                <Field label="Industry">
                  <Select value={data.industry} onValueChange={v => set('industry', v)}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {['Technology', 'Finance', 'Healthcare', 'Retail', 'Manufacturing', 'Construction', 'Education', 'Other'].map(i => (
                        <SelectItem key={i} value={i.toLowerCase()}>{i}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
              {!isCompany && (
                <Field label="Business Reg. Number (optional)">
                  <Input value={data.registrationNumber} onChange={e => set('registrationNumber', e.target.value)} className="h-9" />
                </Field>
              )}
            </div>
            <div className="mt-3">
              <Field label={`Notes (${data.notes.length}/4000)`}>
                <Textarea
                  value={data.notes}
                  onChange={e => { if (e.target.value.length <= 4000) set('notes', e.target.value); }}
                  placeholder="Internal notes about this customer..."
                  rows={3}
                  className="text-sm"
                />
              </Field>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* === CONTACT DETAILS === */}
        <AccordionItem value="contacts" className="border rounded-lg px-4 bg-card">
          <AccordionTrigger className="py-3 hover:no-underline">
            <SectionIcon icon={Users} label={`Contact People (${data.contacts.length})`} />
          </AccordionTrigger>
          <AccordionContent className="pb-4 space-y-3">
            {data.contacts.map((contact, i) => (
              <div key={contact.id} className="rounded-md border p-3 space-y-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    {contact.isPrimary ? '★ Primary Contact' : `Contact ${i + 1}`}
                  </span>
                  <div className="flex items-center gap-2">
                    {!contact.isPrimary && (
                      <Button type="button" variant="ghost" size="sm" className="h-7 text-xs"
                        onClick={() => {
                          setData(prev => ({
                            ...prev,
                            contacts: prev.contacts.map((c, ci) => ({ ...c, isPrimary: ci === i })),
                          }));
                        }}>
                        Set Primary
                      </Button>
                    )}
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => removeContact(i)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="First Name">
                    <Input value={contact.firstName} onChange={e => updateContact(i, 'firstName', e.target.value)} className="h-9" />
                  </Field>
                  <Field label="Last Name">
                    <Input value={contact.lastName} onChange={e => updateContact(i, 'lastName', e.target.value)} className="h-9" />
                  </Field>
                  <Field label="Email">
                    <Input type="email" value={contact.email} onChange={e => updateContact(i, 'email', e.target.value)} className="h-9" />
                  </Field>
                  <Field label="Phone">
                    <Input value={contact.phone} onChange={e => updateContact(i, 'phone', e.target.value)} className="h-9" />
                  </Field>
                  <Field label="Role (optional)">
                    <Input value={contact.role} onChange={e => updateContact(i, 'role', e.target.value)} placeholder="e.g. Accounts Payable" className="h-9" />
                  </Field>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addContact}>
              <Plus className="h-3.5 w-3.5" /> Add Another Person
            </Button>
          </AccordionContent>
        </AccordionItem>

        {/* === ADDRESSES === */}
        <AccordionItem value="addresses" className="border rounded-lg px-4 bg-card">
          <AccordionTrigger className="py-3 hover:no-underline">
            <SectionIcon icon={MapPin} label="Addresses" />
          </AccordionTrigger>
          <AccordionContent className="pb-4 space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Billing Address</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Street" className="sm:col-span-2">
                  <Input value={data.billingStreet} onChange={e => set('billingStreet', e.target.value)} className="h-9" />
                </Field>
                <Field label="Suburb">
                  <Input value={data.billingSuburb} onChange={e => set('billingSuburb', e.target.value)} className="h-9" />
                </Field>
                <Field label="City">
                  <Input value={data.billingCity} onChange={e => set('billingCity', e.target.value)} className="h-9" />
                </Field>
                <Field label="Province">
                  <Input value={data.billingProvince} onChange={e => set('billingProvince', e.target.value)} className="h-9" />
                </Field>
                <Field label="Postal Code">
                  <Input value={data.billingPostalCode} onChange={e => set('billingPostalCode', e.target.value)} className="h-9" />
                </Field>
                <Field label="Country">
                  <Input value={data.billingCountry} onChange={e => set('billingCountry', e.target.value)} className="h-9" />
                </Field>
              </div>
            </div>
            <Separator />
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground">Delivery Address</p>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <Checkbox
                    checked={data.deliverySameAsBilling}
                    onCheckedChange={v => set('deliverySameAsBilling', !!v)}
                  />
                  Same as billing
                </label>
              </div>
              {!data.deliverySameAsBilling && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Street" className="sm:col-span-2">
                    <Input value={data.deliveryStreet} onChange={e => set('deliveryStreet', e.target.value)} className="h-9" />
                  </Field>
                  <Field label="Suburb">
                    <Input value={data.deliverySuburb} onChange={e => set('deliverySuburb', e.target.value)} className="h-9" />
                  </Field>
                  <Field label="City">
                    <Input value={data.deliveryCity} onChange={e => set('deliveryCity', e.target.value)} className="h-9" />
                  </Field>
                  <Field label="Province">
                    <Input value={data.deliveryProvince} onChange={e => set('deliveryProvince', e.target.value)} className="h-9" />
                  </Field>
                  <Field label="Postal Code">
                    <Input value={data.deliveryPostalCode} onChange={e => set('deliveryPostalCode', e.target.value)} className="h-9" />
                  </Field>
                  <Field label="Country">
                    <Input value={data.deliveryCountry} onChange={e => set('deliveryCountry', e.target.value)} className="h-9" />
                  </Field>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* === FINANCIAL DETAILS === */}
        <AccordionItem value="financial" className="border rounded-lg px-4 bg-card">
          <AccordionTrigger className="py-3 hover:no-underline">
            <SectionIcon icon={CreditCard} label="Financial Details" />
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Currency">
                <Select value={data.currency} onValueChange={v => set('currency', v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ZAR">ZAR – South African Rand</SelectItem>
                    <SelectItem value="USD">USD – US Dollar</SelectItem>
                    <SelectItem value="EUR">EUR – Euro</SelectItem>
                    <SelectItem value="GBP">GBP – British Pound</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Credit Limit (optional)">
                <Input type="number" value={data.creditLimit || ''} onChange={e => set('creditLimit', Number(e.target.value))} placeholder="0 = no limit" className="h-9" />
              </Field>
              <div className="flex items-center gap-3 pt-5">
                <Checkbox
                  checked={data.blockOnCreditLimit}
                  onCheckedChange={v => set('blockOnCreditLimit', !!v)}
                />
                <Label className="text-xs">Block new invoices when credit limit is reached</Label>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* === SALES DEFAULTS === */}
        <AccordionItem value="sales" className="border rounded-lg px-4 bg-card">
          <AccordionTrigger className="py-3 hover:no-underline">
            <SectionIcon icon={Settings2} label="Sales Defaults" />
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Default Invoice Due Date">
                <Select value={String(data.defaultDueDays)} onValueChange={v => set('defaultDueDays', Number(v))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Due on receipt</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="15">15 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="60">60 days</SelectItem>
                    <SelectItem value="90">End of following month</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Default Tax Rate (%)">
                <Input type="number" value={data.defaultTaxRate} onChange={e => set('defaultTaxRate', Number(e.target.value))} className="h-9" />
              </Field>
              <Field label="Default Discount (%)">
                <Input type="number" value={data.defaultDiscount || ''} onChange={e => set('defaultDiscount', Number(e.target.value))} className="h-9" />
              </Field>
              <Field label="Default Line Amounts">
                <Select value={data.defaultLineAmounts} onValueChange={v => set('defaultLineAmounts', v as 'tax_inclusive' | 'tax_exclusive')}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tax_inclusive">Tax Inclusive</SelectItem>
                    <SelectItem value="tax_exclusive">Tax Exclusive</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* === TAX SETTINGS === */}
        <AccordionItem value="tax" className="border rounded-lg px-4 bg-card">
          <AccordionTrigger className="py-3 hover:no-underline">
            <SectionIcon icon={Shield} label="Tax Settings" />
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Sales Tax">
                <Select value={data.salesTaxOverride || 'default'} onValueChange={v => set('salesTaxOverride', v === 'default' ? '' : v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Use organisation default</SelectItem>
                    <SelectItem value="15">15% VAT</SelectItem>
                    <SelectItem value="0">0% (Zero rated)</SelectItem>
                    <SelectItem value="exempt">Exempt</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              {isCompany && (
                <Field label="VAT Number">
                  <Input value={data.vatNumber} onChange={e => set('vatNumber', e.target.value)} className="h-9" disabled />
                </Field>
              )}
              <div className="flex items-center gap-3 pt-5">
                <Switch checked={data.taxExempt} onCheckedChange={v => set('taxExempt', v)} />
                <Label className="text-xs">Tax Exempt</Label>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* === INTERNAL SETTINGS === */}
        <AccordionItem value="internal" className="border rounded-lg px-4 bg-card">
          <AccordionTrigger className="py-3 hover:no-underline">
            <SectionIcon icon={Tag} label="Internal Settings" />
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Account Number">
                <Input value={data.accountNumber} onChange={e => set('accountNumber', e.target.value)} placeholder="Unique reference" className="h-9" />
              </Field>
              <Field label="Customer Tags">
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                    placeholder="Add tag..."
                    className="h-9"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={addTag} className="h-9">Add</Button>
                </div>
              </Field>
            </div>
            {data.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {data.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="gap-1 text-xs cursor-pointer" onClick={() => removeTag(tag)}>
                    {tag} <span className="text-muted-foreground">×</span>
                  </Badge>
                ))}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-4 border-t mt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        {onSaveAndCreateInvoice && (
          <Button type="button" variant="secondary" disabled={!isValid() || saving}
            onClick={async () => {
              const err = await handleSubmit();
              if (!err) onSaveAndCreateInvoice(data);
            }}>
            Save & Create Invoice
          </Button>
        )}
        <Button disabled={!isValid() || saving} onClick={handleSubmit}>
          {saving ? 'Saving...' : (initial ? 'Update Customer' : 'Save Customer')}
        </Button>
      </div>
    </div>
  );
}
