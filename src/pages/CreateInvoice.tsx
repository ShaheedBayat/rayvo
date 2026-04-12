import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { v4 as uuidv4 } from 'uuid';
import { useInvoices } from '@/hooks/useInvoiceStore';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useCustomers } from '@/hooks/useCustomers';
import { useProducts } from '@/hooks/useProducts';
import { useTaxRates } from '@/hooks/useTaxRates';
import { useRecurringInvoices } from '@/hooks/useRecurringInvoices';
import { useExpenses } from '@/hooks/useExpenses';
import type { Invoice, InvoiceItem, Currency } from '@/types/invoice';
import { formatCurrency, calculateSmartTotals } from '@/types/invoice';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import AppLayout from '@/components/AppLayout';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import InvoiceLineItems from '@/components/invoice/InvoiceLineItems';
import InvoiceSummary from '@/components/invoice/InvoiceSummary';
import CustomerCombobox from '@/components/invoice/CustomerCombobox';
import PaymentTermsSelect from '@/components/invoice/PaymentTermsSelect';
import BillableExpenses from '@/components/invoice/BillableExpenses';
import { supabase } from '@/integrations/supabase/client';
import { safeExecuteAction } from '@/lib/safeExecuteAction';
import { useActivityLog } from '@/hooks/useActivityLog';

export default function CreateInvoice() {
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const permissions = usePermissions();
  const { addInvoice } = useInvoices();
  const { addRecurring } = useRecurringInvoices();
  const { logActivity } = useActivityLog();
  const { activeCompany } = useActiveCompany();
  const { customers } = useCustomers();
  const { products } = useProducts();
  const { markExpenseAsBilled, refetch: refetchExpenses } = useExpenses();
  const [pendingBilledExpenseIds, setPendingBilledExpenseIds] = useState<string[]>([]);
  const companyId = activeCompany?.id || '';
  const isVatRegistered = activeCompany?.isVatRegistered ?? false;
  const pricingMode = activeCompany?.pricingMode || 'exclusive';
  const { taxRates, ensureDefaults } = useTaxRates(companyId);

  // Ensure default tax rates exist when VAT registered
  useEffect(() => {
    if (isVatRegistered && companyId) ensureDefaults();
  }, [isVatRegistered, companyId, ensureDefaults]);

  // Support duplicate: pre-populate from location state
  const dupState = location.state as Partial<Invoice> | null;

  const defaultRate = isVatRegistered ? (activeCompany?.vatRate ?? 15) : 0;

  const [currency, setCurrency] = useState<Currency>(dupState?.currency || activeCompany?.defaultCurrency || 'ZAR');
  const [clientName, setClientName] = useState(dupState?.clientName || '');
  const [clientEmail, setClientEmail] = useState(dupState?.clientEmail || '');
  const [clientAddress, setClientAddress] = useState(dupState?.clientAddress || '');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    if (dupState?.dueDate) return dupState.dueDate;
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [taxRate, setTaxRate] = useState(dupState?.taxRate ?? defaultRate);

  // Recurring toggle state
  const [isRecurring, setIsRecurring] = useState(false);
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
    setNextRunDate(computeNextRunDate(newFreq, dayOfMonth));
  };
  const handleDayOfMonthChange = (newDay: number) => {
    setDayOfMonth(newDay);
    setNextRunDate(computeNextRunDate(frequency, newDay));
  };

  const [notes, setNotes] = useState(dupState?.notes || '');
  const makeDefaultItem = (): InvoiceItem => {
    const item: InvoiceItem = { id: uuidv4(), description: '', quantity: 0, unitPrice: 0 };
    if (isVatRegistered && taxRates.length > 0) {
      const defaultTax = taxRates.find(t => t.type === 'standard' && t.active) || taxRates.find(t => t.active) || taxRates[0];
      item.taxRate = defaultTax.rate;
      item.taxRateName = defaultTax.name;
    }
    return item;
  };

  const [items, setItems] = useState<InvoiceItem[]>(
    dupState?.items?.map(i => ({ ...i, id: uuidv4() })) || [makeDefaultItem()]
  );

  // Update initial item's tax rate once tax rates load
  useEffect(() => {
    if (isVatRegistered && taxRates.length > 0 && !dupState?.items) {
      setItems(prev => prev.map(item => {
        if (item.taxRate === undefined || item.taxRateName === undefined) {
          const defaultTax = taxRates.find(t => t.type === 'standard' && t.active) || taxRates.find(t => t.active) || taxRates[0];
          return { ...item, taxRate: defaultTax.rate, taxRateName: defaultTax.name };
        }
        return item;
      }));
    }
  }, [isVatRegistered, taxRates, dupState]);

  // Credit limit tracking
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

  const addItem = () => {
    setItems((prev) => [...prev, makeDefaultItem()]);
  };

  const removeItem = (id: string) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  };

  const handleAddBillableExpenses = (newItems: InvoiceItem[], expenseIds: string[]) => {
    setItems(prev => [...prev, ...newItems]);
    setPendingBilledExpenseIds(prev => [...prev, ...expenseIds]);
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
    // Track selected customer for credit limit checks
    const found = customers.find(c => c.name === customer.name);
    setSelectedCustomer(found || null);
  };

  const totals = calculateSmartTotals(items, taxRate, pricingMode, isVatRegistered);

  const hasLineItems = items.some(i => i.description.trim() && i.unitPrice > 0);
  const canSave = clientName.trim() !== '' && hasLineItems && !(creditLimitExceeded && selectedCustomer?.blockOnCreditLimit);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!companyId) {
      toast.error('Please add a company first in the Companies section.');
      return;
    }
    if (selectedCustomer && selectedCustomer.creditLimit > 0 && creditLimitExceeded) {
      if (selectedCustomer.blockOnCreditLimit) {
        toast.error('Customer has exceeded credit limit. Cannot create invoice.');
        return;
      }
    }
    setSaving(true);

    if (!isRecurring) {
      const finalItems = isVatRegistered ? items : items.map(i => ({ ...i, taxRate: 0, taxRateName: undefined }));
      const invoice: Invoice = {
        id: uuidv4(),
        invoiceNumber: '',
        companyId,
        clientName,
        clientEmail,
        clientAddress,
        currency,
        items: finalItems,
        taxRate: isVatRegistered ? taxRate : 0,
        notes,
        status: 'draft',
        createdAt: new Date().toISOString(),
        dueDate,
      };

      await safeExecuteAction({
        actionName: 'Create invoice',
        actionFn: () => addInvoice(invoice),
        verifyFn: async (created) => {
          const { data } = await supabase
            .from('invoices')
            .select('id')
            .eq('id', created.id)
            .maybeSingle();
          return !!data;
        },
        successMessage: `Invoice created successfully`,
        onSuccess: async (created) => {
          // Mark billable expenses as billed
          for (const expId of pendingBilledExpenseIds) {
            await markExpenseAsBilled(expId, created.id);
          }
          if (pendingBilledExpenseIds.length > 0) await refetchExpenses();
          await logActivity('invoice', created.id, 'created', `Invoice ${created.invoiceNumber} created`);
          toast.success(`Invoice ${created.invoiceNumber} created successfully`);
          navigate(`/invoices/${created.id}`);
        },
      });
    } else {
      const finalItems = isVatRegistered ? items : items.map(i => ({ ...i, taxRate: 0, taxRateName: undefined }));
      const result = await addRecurring({
        companyId,
        clientName,
        clientEmail,
        clientAddress,
        currency,
        items: finalItems,
        taxRate: isVatRegistered ? taxRate : 0,
        notes,
        frequency,
        dayOfMonth,
        nextRunDate,
        endDate: null,
        isActive: true,
      });
      if (result) {
        await logActivity('recurring', result.id, 'created', `Recurring template created for ${clientName} (${frequency})`);
        toast.success('Recurring invoice template created');
        navigate('/invoices?tab=recurring');
      } else {
        toast.error('Failed to create recurring invoice');
      }
    }
    setSaving(false);
  };

  if (!permissions.loading && !permissions.canCreateInvoice) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground">You do not have permission to create invoices.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <button
        onClick={() => navigate('/invoices')}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to invoices
      </button>

      <form onSubmit={handleSubmit}>
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold">{isRecurring ? 'New Recurring Invoice' : 'New Invoice'}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {!clientName ? 'Select a customer to begin.' : !hasLineItems ? 'Add at least one line item.' : isRecurring ? 'Set up automatic invoicing for this customer.' : 'Fill in the details below to create a new invoice.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 mr-2">
              <Switch
                id="recurring-toggle"
                checked={isRecurring}
                onCheckedChange={setIsRecurring}
              />
              <Label htmlFor="recurring-toggle" className="text-sm font-medium flex items-center gap-1.5 cursor-pointer">
                <RefreshCw className="h-3.5 w-3.5" />
                Recurring
              </Label>
            </div>
            <Button type="button" variant="outline" onClick={() => navigate('/invoices')}>Cancel</Button>
            <Button type="submit" disabled={!canSave || saving}>
              {saving ? 'Saving...' : isRecurring ? 'Create Recurring' : 'Save as Draft'}
            </Button>
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
                    {activeCompany?.name || 'No company selected'}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Invoice Number</Label>
                  <p className="h-9 flex items-center px-3 rounded-md border bg-muted/50 text-sm mono text-muted-foreground">Auto-generated on save</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Payment Terms</Label>
                  <PaymentTermsSelect value={paymentTerms} onChange={(terms, date) => { setPaymentTerms(terms); if (date) setDueDate(date); }} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Due Date</Label>
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

            {isRecurring && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-6 invoice-shadow">
                <h2 className="text-sm font-medium uppercase tracking-wider text-primary mb-4 flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" /> Recurring Settings
                </h2>
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
                        <p className="text-xs text-muted-foreground mt-1">First invoice in {days} day{days !== 1 ? 's' : ''}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-1">Will run immediately</p>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}

            <BillableExpenses
              clientName={clientName}
              customerId={selectedCustomer?.id || null}
              currency={currency}
              onAddItems={handleAddBillableExpenses}
            />

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
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Payment terms, bank details, thank you message..." rows={3} />
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
