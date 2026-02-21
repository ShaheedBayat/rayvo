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

export default function CreateInvoice() {
  const navigate = useNavigate();
  const { addInvoice } = useInvoices();
  const { companies } = useCompanies();

  const [companyId, setCompanyId] = useState(companies[0]?.id || '');
  const [currency, setCurrency] = useState<Currency>('ZAR');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${String(Date.now()).slice(-6)}`);
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
    setItems(prev => [...prev, { id: uuidv4(), description: '', quantity: 1, unitPrice: 0 }]);
  };

  const removeItem = (id: string) => {
    if (items.length === 1) return;
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(prev =>
      prev.map(i => (i.id === id ? { ...i, [field]: value } : i))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) {
      toast.error('Please add a company first in the Companies tab.');
      return;
    }
    const invoice: Invoice = {
      id: uuidv4(),
      invoiceNumber,
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
    addInvoice(invoice);
    toast.success('Invoice created!');
    navigate(`/invoices/${invoice.id}`);
  };

  return (
    <AppLayout>
      <button
        onClick={() => navigate('/')}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to invoices
      </button>

      <form onSubmit={handleSubmit} className="max-w-4xl space-y-8">
        <div>
          <h1 className="text-2xl font-semibold">New Invoice</h1>
        </div>

        {/* Top row: company, currency, invoice # */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label>Company</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger>
                <SelectValue placeholder="Select company" />
              </SelectTrigger>
              <SelectContent>
                {companies.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={currency} onValueChange={v => setCurrency(v as Currency)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ZAR">ZAR (R)</SelectItem>
                <SelectItem value="USD">USD ($)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Invoice #</Label>
            <Input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Due Date</Label>
            <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
        </div>

        {/* Client details */}
        <div className="rounded-lg border bg-card p-6 invoice-shadow">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">Bill To</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Client Name</Label>
              <Input required value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Company or person name" />
            </div>
            <div className="space-y-2">
              <Label>Client Email</Label>
              <Input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="client@example.com" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Client Address</Label>
              <Textarea value={clientAddress} onChange={e => setClientAddress(e.target.value)} placeholder="Street, city, postal code" rows={2} />
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="rounded-lg border bg-card p-6 invoice-shadow">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">Items</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-[1fr_80px_120px_auto] gap-3 text-xs font-medium text-muted-foreground">
              <span>Description</span>
              <span>Qty</span>
              <span>Unit Price</span>
              <span />
            </div>
            {items.map(item => (
              <div key={item.id} className="grid grid-cols-[1fr_80px_120px_auto] gap-3 items-center">
                <Input
                  required
                  value={item.description}
                  onChange={e => updateItem(item.id, 'description', e.target.value)}
                  placeholder="Service or product description"
                />
                <Input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={e => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                />
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={item.unitPrice}
                  onChange={e => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:text-destructive"
                  onClick={() => removeItem(item.id)}
                  disabled={items.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" className="mt-4" onClick={addItem}>
            <Plus className="mr-1.5 h-4 w-4" /> Add Item
          </Button>

          {/* Totals */}
          <div className="mt-6 border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="mono">{formatCurrency(calculateSubtotal(items), currency)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Tax</span>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={taxRate}
                  onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
                  className="w-16 h-7 text-xs"
                />
                <span className="text-muted-foreground">%</span>
              </div>
              <span className="mono">{formatCurrency(calculateTax(items, taxRate), currency)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold border-t pt-2">
              <span>Total</span>
              <span className="mono">{formatCurrency(calculateTotal(items, taxRate), currency)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Payment terms, bank details, etc." rows={3} />
        </div>

        <div className="flex gap-3">
          <Button type="submit" className="px-8">Create Invoice</Button>
          <Button type="button" variant="outline" onClick={() => navigate('/')}>Cancel</Button>
        </div>
      </form>
    </AppLayout>
  );
}
