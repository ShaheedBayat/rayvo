import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useInvoices, useCompanies } from '@/hooks/useInvoiceStore';
import type { Invoice, InvoiceItem, Currency } from '@/types/invoice';
import { formatCurrency, calculateSubtotal, calculateTax, calculateTotal } from '@/types/invoice';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/components/AppLayout';
import { toast } from 'sonner';

function InvoiceLineItems({
  items,
  currency,
  onAdd,
  onRemove,
  onUpdate,
}: {
  items: InvoiceItem[];
  currency: Currency;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, field: keyof InvoiceItem, value: string | number) => void;
}) {
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Description
              </th>
              <th className="py-2.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground w-20">
                Qty
              </th>
              <th className="py-2.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground w-32">
                Unit Price
              </th>
              <th className="py-2.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground w-32">
                Amount
              </th>
              <th className="py-2.5 w-10" />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b last:border-0 group">
                <td className="py-2">
                  <Input
                    required
                    value={item.description}
                    onChange={(e) => onUpdate(item.id, 'description', e.target.value)}
                    placeholder="Service or product description"
                    className="border-0 shadow-none bg-transparent px-0 h-9 focus-visible:ring-0"
                  />
                </td>
                <td className="py-2">
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => onUpdate(item.id, 'quantity', parseInt(e.target.value) || 0)}
                    className="border-0 shadow-none bg-transparent px-0 h-9 text-right focus-visible:ring-0 mono"
                  />
                </td>
                <td className="py-2">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => onUpdate(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                    className="border-0 shadow-none bg-transparent px-0 h-9 text-right focus-visible:ring-0 mono"
                  />
                </td>
                <td className="py-2 text-right mono font-medium text-sm pr-2">
                  {formatCurrency(item.quantity * item.unitPrice, currency)}
                </td>
                <td className="py-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onRemove(item.id)}
                    disabled={items.length === 1}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button type="button" variant="ghost" size="sm" className="mt-2 text-primary" onClick={onAdd}>
        <Plus className="mr-1.5 h-4 w-4" /> Add line item
      </Button>
    </div>
  );
}

function InvoiceSummary({
  items,
  taxRate,
  currency,
  onTaxRateChange,
}: {
  items: InvoiceItem[];
  taxRate: number;
  currency: Currency;
  onTaxRateChange: (rate: number) => void;
}) {
  return (
    <div className="flex justify-end">
      <div className="w-72 space-y-2.5">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="mono font-medium">{formatCurrency(calculateSubtotal(items), currency)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Tax</span>
            <Input
              type="number"
              min={0}
              max={100}
              value={taxRate}
              onChange={(e) => onTaxRateChange(parseFloat(e.target.value) || 0)}
              className="w-14 h-7 text-xs text-center"
            />
            <span className="text-muted-foreground text-xs">%</span>
          </div>
          <span className="mono">{formatCurrency(calculateTax(items, taxRate), currency)}</span>
        </div>
        <div className="flex justify-between text-base font-semibold border-t pt-3">
          <span>Total</span>
          <span className="mono text-primary">
            {formatCurrency(calculateTotal(items, taxRate), currency)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function CreateInvoice() {
  const navigate = useNavigate();
  const { addInvoice } = useInvoices();
  const { companies } = useCompanies();

  const [companyId, setCompanyId] = useState(companies[0]?.id || '');
  const [currency, setCurrency] = useState<Currency>('ZAR');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [taxRate, setTaxRate] = useState(15);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: uuidv4(), description: '', quantity: 1, unitPrice: 0 },
  ]);

  const addItem = () => {
    setItems((prev) => [...prev, { id: uuidv4(), description: '', quantity: 1, unitPrice: 0 }]);
  };

  const removeItem = (id: string) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) {
      toast.error('Please add a company first in the Companies section.');
      return;
    }
    const invoice: Invoice = {
      id: uuidv4(),
      invoiceNumber: '', // system-generated by DB trigger
      companyId,
      clientName,
      clientEmail,
      clientAddress,
      currency,
      items,
      taxRate,
      notes,
      status: 'draft',
      createdAt: new Date().toISOString(),
      dueDate,
    };
    const created = await addInvoice(invoice);
    if (created) {
      toast.success('Invoice created!');
      navigate(`/invoices/${created.id}`);
    } else {
      toast.error('Failed to create invoice');
    }
  };

  return (
    <AppLayout>
      <button
        onClick={() => navigate('/invoices')}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to invoices
      </button>

      <form onSubmit={handleSubmit}>
        {/* Header row */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold">New Invoice</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Fill in the details below to create a new invoice.
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => navigate('/invoices')}>
              Cancel
            </Button>
            <Button type="submit">Save as Draft</Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Main column */}
          <div className="space-y-6">
            {/* Invoice details */}
            <div className="rounded-lg border bg-card p-6 invoice-shadow">
              <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4">
                Invoice Details
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Company</Label>
                  <Select value={companyId} onValueChange={setCompanyId}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select company" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Invoice Number</Label>
                  <p className="h-9 flex items-center px-3 rounded-md border bg-muted/50 text-sm mono text-muted-foreground">
                    Auto-generated on save
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Due Date</Label>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Currency</Label>
                  <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ZAR">ZAR (R)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Line items */}
            <div className="rounded-lg border bg-card p-6 invoice-shadow">
              <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4">
                Line Items
              </h2>
              <InvoiceLineItems
                items={items}
                currency={currency}
                onAdd={addItem}
                onRemove={removeItem}
                onUpdate={updateItem}
              />
              <div className="mt-6 border-t pt-4">
                <InvoiceSummary
                  items={items}
                  taxRate={taxRate}
                  currency={currency}
                  onTaxRateChange={setTaxRate}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="rounded-lg border bg-card p-6 invoice-shadow">
              <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4">
                Notes & Terms
              </h2>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Payment terms, bank details, thank you message..."
                rows={3}
              />
            </div>
          </div>

          {/* Sidebar - Customer details */}
          <div className="space-y-6">
            <div className="rounded-lg border bg-card p-6 invoice-shadow">
              <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4">
                Bill To
              </h2>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Customer Name</Label>
                  <Input
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Company or person name"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email</Label>
                  <Input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="client@example.com"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Address</Label>
                  <Textarea
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                    placeholder="Street, city, postal code"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Summary card */}
            <div className="rounded-lg border bg-primary/5 p-6 invoice-shadow">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                Invoice Summary
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Items</span>
                  <span>{items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="mono">{formatCurrency(calculateSubtotal(items), currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax ({taxRate}%)</span>
                  <span className="mono">{formatCurrency(calculateTax(items, taxRate), currency)}</span>
                </div>
                <div className="flex justify-between font-semibold text-base border-t pt-2">
                  <span>Total</span>
                  <span className="mono text-primary">
                    {formatCurrency(calculateTotal(items, taxRate), currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </AppLayout>
  );
}
