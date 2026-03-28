import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useRecurringInvoices } from '@/hooks/useRecurringInvoices';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useCompanies } from '@/hooks/useInvoiceStore';
import { useCustomers } from '@/hooks/useCustomers';
import { useProducts } from '@/hooks/useProducts';
import { useTaxRates } from '@/hooks/useTaxRates';
import { formatCurrency, calculateSmartTotals } from '@/types/invoice';
import type { Currency, InvoiceItem } from '@/types/invoice';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/components/AppLayout';
import InvoiceLineItems from '@/components/invoice/InvoiceLineItems';
import InvoiceSummary from '@/components/invoice/InvoiceSummary';
import CustomerCombobox from '@/components/invoice/CustomerCombobox';
import PaymentTermsSelect from '@/components/invoice/PaymentTermsSelect';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function RecurringInvoiceForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const { recurring, addRecurring, updateRecurring } = useRecurringInvoices();
  const { companies } = useCompanies();
  const { activeCompany, activeCompanyId } = useActiveCompany();
  const { customers } = useCustomers();
  const { products } = useProducts();
  const companyId = activeCompanyId || '';
  const isVatRegistered = activeCompany?.isVatRegistered ?? false;
  const pricingMode = activeCompany?.pricingMode || 'exclusive';
  const { taxRates, ensureDefaults } = useTaxRates(companyId);

  const defaultRate = isVatRegistered ? (activeCompany?.vatRate ?? 15) : 0;

  useEffect(() => {
    if (isVatRegistered && companyId) ensureDefaults();
  }, [isVatRegistered, companyId, ensureDefaults]);

  // Form state
  const [currency, setCurrency] = useState<Currency>('ZAR');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [taxRate, setTaxRate] = useState(defaultRate);
  const [notes, setNotes] = useState('');
  const [frequency, setFrequency] = useState<'monthly' | 'weekly' | 'yearly'>('monthly');
  const [dayOfMonth, setDayOfMonth] = useState(1);

  const computeNextRunDate = (freq: string, dom: number): string => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (freq === 'weekly') {
      const d = new Date(today);
      d.setDate(d.getDate() + 7);
      return d.toISOString().split('T')[0];
    }
    if (freq === 'yearly') {
      const d = new Date(today);
      d.setFullYear(d.getFullYear() + 1);
      return d.toISOString().split('T')[0];
    }
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const maxDayThis = new Date(thisMonth.getFullYear(), thisMonth.getMonth() + 1, 0).getDate();
    const targetDayThis = Math.min(dom, maxDayThis);
    const candidateThis = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), targetDayThis);
    if (candidateThis > today) return candidateThis.toISOString().split('T')[0];
    const nextMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth() + 1, 1);
    const maxDayNext = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
    const targetDayNext = Math.min(dom, maxDayNext);
    return new Date(nextMonth.getFullYear(), nextMonth.getMonth(), targetDayNext).toISOString().split('T')[0];
  };

  const [nextRunDate, setNextRunDate] = useState(() => computeNextRunDate('monthly', 1));

  const handleFrequencyChange = (newFreq: 'monthly' | 'weekly' | 'yearly') => {
    setFrequency(newFreq);
    if (!editId) setNextRunDate(computeNextRunDate(newFreq, dayOfMonth));
  };
  const handleDayOfMonthChange = (newDay: number) => {
    setDayOfMonth(newDay);
    if (!editId) setNextRunDate(computeNextRunDate(frequency, newDay));
  };

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
  const [formLoaded, setFormLoaded] = useState(false);

  // Load edit data
  useEffect(() => {
    if (editId && recurring.length > 0 && !formLoaded) {
      const r = recurring.find(rec => rec.id === editId);
      if (r) {
        setClientName(r.clientName);
        setClientEmail(r.clientEmail);
        setClientAddress(r.clientAddress);
        setCurrency(r.currency);
        setTaxRate(r.taxRate);
        setNotes(r.notes);
        setFrequency(r.frequency);
        setDayOfMonth(r.dayOfMonth);
        setNextRunDate(r.nextRunDate);
        setItems(r.items.length > 0 ? r.items.map(i => ({ ...i, id: i.id || uuidv4() })) : [makeDefaultItem()]);
        const found = customers.find(c => c.name === r.clientName);
        setSelectedCustomer(found || null);
        setFormLoaded(true);
      }
    }
  }, [editId, recurring, formLoaded, customers]);

  // Update initial item's tax rate once tax rates load
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

  const [selectedCustomer, setSelectedCustomer] = useState<typeof customers[0] | null>(null);
  const [outstandingBalance, setOutstandingBalance] = useState(0);

  const creditLimitExceeded = useMemo(() => {
    if (!selectedCustomer || !selectedCustomer.creditLimit || selectedCustomer.creditLimit <= 0) return false;
    return outstandingBalance >= selectedCustomer.creditLimit;
  }, [selectedCustomer, outstandingBalance]);

  const creditLimitWarning = useMemo(() => {
    if (!selectedCustomer || !selectedCustomer.creditLimit || selectedCustomer.creditLimit <= 0) return false;
    return !creditLimitExceeded && outstandingBalance >= selectedCustomer.creditLimit * 0.8;
  }, [selectedCustomer, outstandingBalance, creditLimitExceeded]);

  useEffect(() => {
    if (!selectedCustomer || !companyId) { setOutstandingBalance(0); return; }
    const fetchBalance = async () => {
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, items, tax_rate, status')
        .eq('company_id', companyId)
        .eq('client_name', selectedCustomer.name)
        .is('deleted_at', null)
        .in('status', ['draft', 'approved', 'sent', 'partially_paid']);
      if (!invoices || invoices.length === 0) { setOutstandingBalance(0); return; }
      const invoiceIds = invoices.map(inv => inv.id);
      const { data: payments } = await supabase
        .from('payments')
        .select('invoice_id, amount')
        .in('invoice_id', invoiceIds);
      const paidMap = new Map<string, number>();
      payments?.forEach(p => paidMap.set(p.invoice_id, (paidMap.get(p.invoice_id) || 0) + Number(p.amount)));
      let total = 0;
      invoices.forEach(inv => {
        const invItems = (inv.items as any[]) || [];
        const lineTotal = invItems.reduce((sum: number, item: any) => sum + (item.quantity || 0) * (item.unitPrice || 0), 0);
        const paid = paidMap.get(inv.id) || 0;
        total += Math.max(0, lineTotal - paid);
      });
      setOutstandingBalance(total);
    };
    fetchBalance();
  }, [selectedCustomer, companyId]);

  const addItem = () => setItems(prev => [...prev, makeDefaultItem()]);
  const removeItem = (id: string) => { if (items.length > 1) setItems(prev => prev.filter(i => i.id !== id)); };
  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(prev => prev.map(i => (i.id === id ? { ...i, [field]: value } : i)));
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
    const found = customers.find(c => c.name === customer.name);
    setSelectedCustomer(found || null);
  };

  const totals = calculateSmartTotals(items, taxRate, pricingMode, isVatRegistered);
  const hasLineItems = items.some(i => i.description.trim() && i.unitPrice > 0);
  const canSave = clientName.trim() !== '' && hasLineItems && !(creditLimitExceeded && selectedCustomer?.blockOnCreditLimit);

  const goBack = () => navigate('/invoices?tab=recurring');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) { toast.error('Please add a company first in the Companies section.'); return; }
    if (!clientName) { toast.error('Select a customer.'); return; }
    if (!hasLineItems) { toast.error('Add at least one line item.'); return; }
    if (selectedCustomer && selectedCustomer.creditLimit > 0 && creditLimitExceeded) {
      if (selectedCustomer.blockOnCreditLimit) {
        toast.error('Customer has exceeded credit limit. Cannot create recurring invoice.');
        return;
      }
    }
    const finalItems = isVatRegistered ? items : items.map(i => ({ ...i, taxRate: 0, taxRateName: undefined }));

    if (editId) {
      const success = await updateRecurring(editId, {
        companyId, clientName, clientEmail, clientAddress, currency,
        items: finalItems, taxRate: isVatRegistered ? taxRate : 0,
        notes, frequency, dayOfMonth, nextRunDate,
      });
      if (success) { toast.success('Recurring invoice updated'); goBack(); }
      else toast.error('Failed to update');
    } else {
      const result = await addRecurring({
        companyId, clientName, clientEmail, clientAddress, currency,
        items: finalItems, taxRate: isVatRegistered ? taxRate : 0,
        notes, frequency, dayOfMonth, nextRunDate, endDate: null, isActive: true,
      });
      if (result) { toast.success('Recurring invoice created'); goBack(); }
      else toast.error('Failed to create');
    }
  };

  return (
    <AppLayout>
      <button
        onClick={goBack}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to recurring invoices
      </button>

      <form onSubmit={handleSubmit}>
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold">{editId ? 'Edit Recurring Invoice' : 'New Recurring Invoice'}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {!clientName ? 'Select a customer to begin.' : !hasLineItems ? 'Add at least one line item.' : editId ? 'Update the recurring invoice details.' : 'Fill in the details below to create a recurring invoice.'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={goBack}>Cancel</Button>
            <Button type="submit" disabled={!canSave}>{editId ? 'Save Changes' : 'Create Recurring'}</Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            {/* Invoice Details */}
            <div className="rounded-lg border bg-card p-6 invoice-shadow">
              <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4">Invoice Details</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Company</Label>
                  <p className="h-9 flex items-center px-3 rounded-md border bg-muted/50 text-sm font-medium">
                    {activeCompany?.name || 'No company selected'}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Invoice Number</Label>
                  <p className="h-9 flex items-center px-3 rounded-md border bg-muted/50 text-sm mono text-muted-foreground">Auto-generated on each run</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Payment Terms</Label>
                  <PaymentTermsSelect value={paymentTerms} onChange={(terms, date) => { setPaymentTerms(terms); if (date) setDueDate(date); }} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Due Date (from generation)</Label>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-9" />
                  {dueDate && (() => {
                    const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86400000);
                    return days > 0 ? (
                      <p className="text-xs text-muted-foreground mt-1">Due in {days} day{days !== 1 ? 's' : ''}</p>
                    ) : days === 0 ? (
                      <p className="text-xs text-warning mt-1">Due today</p>
                    ) : (
                      <p className="text-xs text-destructive mt-1">Already {Math.abs(days)} day{Math.abs(days) !== 1 ? 's' : ''} past</p>
                    );
                  })()}
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

            {/* Recurring Settings */}
            <div className="rounded-lg border bg-card p-6 invoice-shadow">
              <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4">Recurring Settings</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Frequency</Label>
                  <Select value={frequency} onValueChange={v => handleFrequencyChange(v as any)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {frequency === 'monthly' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Day of Month</Label>
                    <Input type="number" min={1} max={28} value={dayOfMonth} onChange={e => handleDayOfMonthChange(parseInt(e.target.value) || 1)} className="h-9" />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs">Start Date (Next Run)</Label>
                  <Input type="date" value={nextRunDate} onChange={e => setNextRunDate(e.target.value)} className="h-9" />
                  {nextRunDate && (() => {
                    const days = Math.ceil((new Date(nextRunDate).getTime() - Date.now()) / 86400000);
                    return days > 0 ? (
                      <p className="text-xs text-muted-foreground mt-1">Starts in {days} day{days !== 1 ? 's' : ''}</p>
                    ) : days === 0 ? (
                      <p className="text-xs text-primary mt-1">Starts today</p>
                    ) : (
                      <p className="text-xs text-destructive mt-1">Date is in the past — will generate immediately</p>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Line Items */}
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

            {/* Notes & Terms */}
            <div className="rounded-lg border bg-card p-6 invoice-shadow">
              <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4">Notes & Terms</h2>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Payment terms, bank details, thank you message..." rows={3} />
            </div>
          </div>

          {/* Sidebar */}
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
              {creditLimitExceeded && selectedCustomer && (
                <Alert variant="destructive" className="mt-3">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Customer has exceeded credit limit ({formatCurrency(selectedCustomer.creditLimit, currency)}).
                    Outstanding: {formatCurrency(outstandingBalance, currency)}.
                    {selectedCustomer.blockOnCreditLimit ? ' Invoice creation is blocked.' : ' Proceed with caution.'}
                  </AlertDescription>
                </Alert>
              )}
              {creditLimitWarning && selectedCustomer && (
                <Alert className="mt-3 border-yellow-500/50 bg-yellow-500/10">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-700 dark:text-yellow-400">
                    Customer is approaching credit limit ({formatCurrency(outstandingBalance, currency)} / {formatCurrency(selectedCustomer.creditLimit, currency)}).
                  </AlertDescription>
                </Alert>
              )}
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
