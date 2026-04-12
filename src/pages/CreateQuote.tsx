import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useQuotes } from '@/hooks/useQuotes';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useCustomers } from '@/hooks/useCustomers';
import { useProducts } from '@/hooks/useProducts';
import { useTaxRates } from '@/hooks/useTaxRates';
import type { InvoiceItem, Currency } from '@/types/invoice';
import CurrencySelect from '@/components/invoice/CurrencySelect';
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
import { supabase } from '@/integrations/supabase/client';
import { safeExecuteAction } from '@/lib/safeExecuteAction';
import { useActivityLog } from '@/hooks/useActivityLog';

export default function CreateQuote() {
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { addQuote, refetch } = useQuotes();
  const { logActivity } = useActivityLog();
  const { activeCompany } = useActiveCompany();
  const { customers } = useCustomers();
  const { products } = useProducts();
  const companyId = activeCompany?.id || '';
  const isVatRegistered = activeCompany?.isVatRegistered ?? false;
  const pricingMode = activeCompany?.pricingMode || 'exclusive';
  const { taxRates, ensureDefaults } = useTaxRates(companyId);

  useEffect(() => {
    if (isVatRegistered && companyId) ensureDefaults();
  }, [isVatRegistered, companyId, ensureDefaults]);

  const defaultRate = isVatRegistered ? (activeCompany?.vatRate ?? 15) : 0;

  const [currency, setCurrency] = useState<Currency>('ZAR');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [taxRate, setTaxRate] = useState(defaultRate);
  const [notes, setNotes] = useState('');

  const makeDefaultItem = (): InvoiceItem => {
    const item: InvoiceItem = { id: uuidv4(), description: '', quantity: 0, unitPrice: 0 };
    if (isVatRegistered && taxRates.length > 0) {
      const defaultTax = taxRates.find(t => t.type === 'standard' && t.active) || taxRates.find(t => t.active) || taxRates[0];
      item.taxRate = defaultTax.rate;
      item.taxRateName = defaultTax.name;
    }
    return item;
  };

  const [items, setItems] = useState<InvoiceItem[]>([makeDefaultItem()]);

  useEffect(() => {
    if (isVatRegistered && taxRates.length > 0) {
      setItems(prev => prev.map(item => {
        if (item.taxRate === undefined || item.taxRateName === undefined) {
          const defaultTax = taxRates.find(t => t.type === 'standard' && t.active) || taxRates.find(t => t.active) || taxRates[0];
          return { ...item, taxRate: defaultTax.rate, taxRateName: defaultTax.name };
        }
        return item;
      }));
    }
  }, [isVatRegistered, taxRates]);

  const handleCustomerSelect = (customer: { name: string; email: string; address: string; taxRate?: number; currency?: string }) => {
    setClientName(customer.name);
    setClientEmail(customer.email);
    setClientAddress(customer.address);
    if (customer.taxRate !== undefined) setTaxRate(customer.taxRate);
    if (customer.currency) setCurrency(customer.currency as Currency);
  };

  const addItem = () => setItems(prev => [...prev, makeDefaultItem()]);
  const removeItem = (id: string) => { if (items.length > 1) setItems(prev => prev.filter(i => i.id !== id)); };
  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(prev => prev.map(i => (i.id === id ? { ...i, [field]: value } : i)));
  };

  const totals = calculateSmartTotals(items, taxRate, pricingMode, isVatRegistered);
  const hasLineItems = items.some(i => i.description.trim() && i.unitPrice > 0);
  const canSave = clientName.trim() !== '' && hasLineItems;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!companyId) { toast.error('Please add a company first in the Companies section.'); return; }
    if (!clientName.trim()) { toast.error('Please select a customer.'); return; }
    if (!hasLineItems) { toast.error('Add at least one line item with a description and price.'); return; }

    setSaving(true);
    const finalItems = isVatRegistered ? items : items.map(i => ({ ...i, taxRate: 0, taxRateName: undefined }));
    const quoteId = uuidv4();

    await safeExecuteAction({
      actionName: 'Create quote',
      actionFn: () => addQuote({
        id: quoteId,
        companyId,
        clientName,
        clientEmail,
        clientAddress,
        items: finalItems,
        taxRate: isVatRegistered ? taxRate : 0,
        currency,
        status: 'draft',
        notes,
        validUntil,
      }),
      verifyFn: async () => {
        const { data } = await supabase.from('quotes').select('id').eq('id', quoteId).maybeSingle();
        return !!data;
      },
      silentSuccess: true,
      onSuccess: async (result) => {
        await logActivity('quote', result.id, 'created', `Quote ${result.quoteNumber} created`);
        await refetch();
        toast.success(`Quote ${result.quoteNumber} created successfully`);
        navigate('/quotes');
      },
    });
    setSaving(false);
  };

  return (
    <AppLayout>
      <button
        onClick={() => navigate('/quotes')}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to quotes
      </button>

      <form onSubmit={handleSubmit}>
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold">New Quote</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {!clientName ? 'Select a customer to begin.' : !hasLineItems ? 'Add at least one line item.' : 'Fill in the details below to create a new quote.'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => navigate('/quotes')}>Cancel</Button>
            <Button type="submit" disabled={!canSave || saving}>
              {saving ? 'Creating...' : 'Save as Draft'}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <div className="rounded-lg border bg-card p-6 invoice-shadow">
              <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4">Quote Details</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Company</Label>
                  <p className="h-9 flex items-center px-3 rounded-md border bg-muted/50 text-sm font-medium">
                    {activeCompany?.name || 'No company selected'}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Quote Number</Label>
                  <p className="h-9 flex items-center px-3 rounded-md border bg-muted/50 text-sm mono text-muted-foreground">Auto-generated on save</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Valid Until</Label>
                  <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="h-9" />
                  {validUntil && (() => {
                    const days = Math.ceil((new Date(validUntil).getTime() - Date.now()) / 86400000);
                    return days > 0 ? (
                      <p className="text-xs text-muted-foreground mt-1">Valid for {days} day{days !== 1 ? 's' : ''}</p>
                    ) : days === 0 ? (
                      <p className="text-xs text-warning mt-1">Expires today</p>
                    ) : (
                      <p className="text-xs text-destructive mt-1">Expired {Math.abs(days)} day{Math.abs(days) !== 1 ? 's' : ''} ago</p>
                    );
                  })()}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Currency</Label>
                  <CurrencySelect value={currency} onChange={setCurrency} />
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-card p-6 invoice-shadow" style={{ overflow: 'visible' }}>
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
                onCreateNewProduct={() => navigate('/products')}
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
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Payment terms, conditions, thank you message..." rows={3} />
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
                onCreateNew={() => navigate('/customers')}
              />
            </div>

            <div className="rounded-lg border bg-primary/5 p-6 invoice-shadow">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Quote Summary</p>
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
