import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useInvoices } from '@/hooks/useInvoiceStore';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useCustomers } from '@/hooks/useCustomers';
import { useProducts } from '@/hooks/useProducts';
import { useTaxRates } from '@/hooks/useTaxRates';
import type { Invoice, InvoiceItem, Currency } from '@/types/invoice';
import { formatCurrency, calculateSmartTotals } from '@/types/invoice';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/components/AppLayout';
import { toast } from 'sonner';
import InvoiceLineItems from '@/components/invoice/InvoiceLineItems';
import InvoiceSummary from '@/components/invoice/InvoiceSummary';
import CustomerCombobox from '@/components/invoice/CustomerCombobox';
import PaymentTermsSelect from '@/components/invoice/PaymentTermsSelect';

export default function EditInvoice() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getInvoice, updateInvoice } = useInvoices();
  const { activeCompany } = useActiveCompany();
  const { customers } = useCustomers();
  const { products } = useProducts();
  const isVatRegistered = activeCompany?.isVatRegistered ?? false;
  const pricingMode = activeCompany?.pricingMode || 'exclusive';
  const { taxRates, ensureDefaults } = useTaxRates(activeCompany?.id);

  useEffect(() => {
    if (isVatRegistered && activeCompany?.id) ensureDefaults();
  }, [isVatRegistered, activeCompany?.id, ensureDefaults]);

  const invoice = getInvoice(id || '');

  const [currency, setCurrency] = useState<Currency>('ZAR');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [taxRate, setTaxRate] = useState(15);
  const [notes, setNotes] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (invoice && !loaded) {
      setCurrency(invoice.currency);
      setClientName(invoice.clientName);
      setClientEmail(invoice.clientEmail);
      setClientAddress(invoice.clientAddress);
      setDueDate(invoice.dueDate);
      setTaxRate(invoice.taxRate);
      setNotes(invoice.notes);
      setItems(invoice.items);
      setLoaded(true);
    }
  }, [invoice, loaded]);

  if (!invoice) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Invoice not found.</p>
        </div>
      </AppLayout>
    );
  }

  if (invoice.status !== 'draft' && invoice.status !== 'approved') {
    navigate(`/invoices/${invoice.id}`);
    return null;
  }

  const addItem = () => {
    const newItem: InvoiceItem = { id: uuidv4(), description: '', quantity: 1, unitPrice: 0 };
    if (isVatRegistered && taxRates.length > 0) {
      const defaultTax = taxRates.find(t => t.type === 'standard' && t.active) || taxRates[0];
      newItem.taxRate = defaultTax.rate;
      newItem.taxRateName = defaultTax.name;
    }
    setItems(prev => [...prev, newItem]);
  };

  const removeItem = (itemId: string) => {
    if (items.length === 1) return;
    setItems(prev => prev.filter(i => i.id !== itemId));
  };

  const updateItem = (itemId: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(prev => prev.map(i => (i.id === itemId ? { ...i, [field]: value } : i)));
  };

  const handleCustomerSelect = (customer: { name: string; email: string; address: string; taxRate?: number; currency?: string; dueDays?: number }) => {
    setClientName(customer.name);
    setClientEmail(customer.email);
    setClientAddress(customer.address);
    if (customer.taxRate !== undefined) setTaxRate(customer.taxRate);
    if (customer.currency) setCurrency(customer.currency as Currency);
    if (customer.dueDays !== undefined) {
      const d = new Date();
      d.setDate(d.getDate() + customer.dueDays);
      setDueDate(d.toISOString().split('T')[0]);
    }
  };

  const totals = calculateSmartTotals(items, taxRate, pricingMode, isVatRegistered);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalItems = isVatRegistered ? items : items.map(i => ({ ...i, taxRate: 0, taxRateName: undefined }));
    const updated: Invoice = {
      ...invoice,
      clientName,
      clientEmail,
      clientAddress,
      currency,
      items: finalItems,
      taxRate: isVatRegistered ? taxRate : 0,
      notes,
      dueDate,
    };
    await updateInvoice(updated);
    toast.success('Invoice updated!');
    navigate(`/invoices/${invoice.id}`);
  };

  return (
    <AppLayout>
      <button
        onClick={() => navigate(`/invoices/${invoice.id}`)}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to invoice
      </button>

      <form onSubmit={handleSubmit}>
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold">Edit Invoice</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {invoice.invoiceNumber} — Editing draft
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => navigate(`/invoices/${invoice.id}`)}>
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <div className="rounded-lg border bg-card p-6 invoice-shadow">
              <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4">Invoice Details</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Company</Label>
                  <p className="h-9 flex items-center px-3 rounded-md border bg-muted/50 text-sm font-medium">
                    {activeCompany?.name || 'No company'}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Invoice Number</Label>
                  <p className="h-9 flex items-center px-3 rounded-md border bg-muted/50 text-sm mono">
                    {invoice.invoiceNumber}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Payment Terms</Label>
                  <PaymentTermsSelect value={paymentTerms} onChange={(terms, date) => { setPaymentTerms(terms); if (date) setDueDate(date); }} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Due Date</Label>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Currency</Label>
                  <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
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

            <div className="rounded-lg border bg-card p-6 invoice-shadow">
              <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4">Line Items</h2>
              <InvoiceLineItems
                items={items}
                currency={currency}
                products={products}
                taxRates={taxRates}
                isVatRegistered={isVatRegistered}
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
                    isVatRegistered={isVatRegistered}
                    pricingMode={pricingMode}
                />
              </div>
            </div>

            <div className="rounded-lg border bg-card p-6 invoice-shadow">
              <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4">Notes & Terms</h2>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Payment terms, bank details..." rows={3} />
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-lg border bg-card p-6 invoice-shadow">
              <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4">Bill To</h2>
              <CustomerCombobox
                customers={customers}
                clientName={clientName}
                clientEmail={clientEmail}
                clientAddress={clientAddress}
                onSelect={handleCustomerSelect}
                onNameChange={setClientName}
                onEmailChange={setClientEmail}
                onAddressChange={setClientAddress}
              />
            </div>

            <div className="rounded-lg border bg-primary/5 p-6 invoice-shadow">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Invoice Summary</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Items</span>
                  <span>{items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="mono">{formatCurrency(totals.subtotal, currency)}</span>
                </div>
                {isVatRegistered && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">VAT</span>
                    <span className="mono">{formatCurrency(totals.tax, currency)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-base border-t pt-2">
                  <span>Total</span>
                  <span className="mono text-primary">{formatCurrency(totals.total, currency)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </AppLayout>
  );
}
