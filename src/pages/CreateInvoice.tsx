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
import type { Invoice, InvoiceItem, Currency, InvoiceType, DepositType } from '@/types/invoice';
import { formatCurrency, calculateSmartTotals } from '@/types/invoice';
import { ArrowLeft, RefreshCw, Send, Save } from 'lucide-react';
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
import CurrencySelect from '@/components/invoice/CurrencySelect';
import InvoiceDatePicker from '@/components/invoice/InvoiceDatePicker';
import InvoiceLivePreview from '@/components/invoice/InvoiceLivePreview';
import { supabase } from '@/integrations/supabase/client';
import { safeExecuteAction } from '@/lib/safeExecuteAction';
import { useActivityLog } from '@/hooks/useActivityLog';

export default function CreateInvoice() {
  const [saving, setSaving] = useState(false);
  const [saveAction, setSaveAction] = useState<'draft' | 'send'>('draft');
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

  useEffect(() => {
    if (isVatRegistered && companyId) ensureDefaults();
  }, [isVatRegistered, companyId, ensureDefaults]);

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

  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<'monthly' | 'weekly' | 'yearly'>('monthly');
  const [dayOfMonth, setDayOfMonth] = useState(1);

  const [invoiceType, setInvoiceType] = useState<InvoiceType>('standard');
  const [depositType, setDepositType] = useState<DepositType>('percentage');
  const [depositValue, setDepositValue] = useState(50);

  const computeNextRunDate = (freq: string, dom: number): string => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (freq === 'weekly') { const d = new Date(today); d.setDate(d.getDate() + 7); return d.toISOString().split('T')[0]; }
    if (freq === 'yearly') { const d = new Date(today); d.setFullYear(d.getFullYear() + 1); return d.toISOString().split('T')[0]; }
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
  const removeItem = (id: string) => { if (items.length === 1) return; setItems(prev => prev.filter(i => i.id !== id)); };
  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(prev => prev.map(i => (i.id === id ? { ...i, [field]: value } : i)));
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
    const found = customers.find(c => c.name === customer.name);
    setSelectedCustomer(found || null);
  };

  const totals = calculateSmartTotals(items, taxRate, pricingMode, isVatRegistered);
  const hasLineItems = items.some(i => i.description.trim() && i.unitPrice > 0);
  const canSave = clientName.trim() !== '' && hasLineItems && !(creditLimitExceeded && selectedCustomer?.blockOnCreditLimit);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!companyId) { toast.error('Please add a company first in the Companies section.'); return; }
    if (selectedCustomer && selectedCustomer.creditLimit > 0 && creditLimitExceeded) {
      if (selectedCustomer.blockOnCreditLimit) { toast.error('Customer has exceeded credit limit. Cannot create invoice.'); return; }
    }
    setSaving(true);

    if (!isRecurring) {
      const finalItems = isVatRegistered ? items : items.map(i => ({ ...i, taxRate: 0, taxRateName: undefined }));

      // For deposit invoices, replace the line items with a single "deposit" line
      // for the deposit amount only. The full job total is preserved in jobTotal
      // so the balance invoice can be auto-created when the deposit is paid.
      let invoiceItems = finalItems;
      let invoiceTaxRate = isVatRegistered ? taxRate : 0;
      let jobTotal: number | undefined = undefined;

      if (invoiceType === 'deposit') {
        const fullJobTotal = totals.total;
        const depositAmount = depositType === 'percentage'
          ? fullJobTotal * (depositValue / 100)
          : Math.min(depositValue, fullJobTotal);
        const roundedDeposit = Math.round(depositAmount * 100) / 100;
        const depositLabel = depositType === 'percentage'
          ? `${depositValue}% deposit — Job total ${formatCurrency(fullJobTotal, currency)}`
          : `Deposit payment — Job total ${formatCurrency(fullJobTotal, currency)}`;
        invoiceItems = [{
          id: uuidv4(),
          description: depositLabel,
          quantity: 1,
          unitPrice: roundedDeposit,
        }];
        // Tax was already accounted for in the job total computation; set to 0 to
        // avoid double-taxing the deposit line.
        invoiceTaxRate = 0;
        jobTotal = fullJobTotal;
      }

      const invoice: Invoice = {
        id: uuidv4(), invoiceNumber: '', companyId, clientName, clientEmail, clientAddress, currency,
        items: invoiceItems, taxRate: invoiceTaxRate, notes,
        status: saveAction === 'send' ? 'sent' : 'draft',
        createdAt: new Date().toISOString(), dueDate, invoiceType,
        depositType: invoiceType === 'deposit' ? depositType : undefined,
        depositValue: invoiceType === 'deposit' ? depositValue : undefined,
        jobTotal,
      };

      await safeExecuteAction({
        actionName: 'Create invoice',
        actionFn: () => addInvoice(invoice),
        verifyFn: async (created) => {
          const { data } = await supabase.from('invoices').select('id').eq('id', created.id).maybeSingle();
          return !!data;
        },
        successMessage: `Invoice created successfully`,
        onSuccess: async (created) => {
          for (const expId of pendingBilledExpenseIds) await markExpenseAsBilled(expId, created.id);
          if (pendingBilledExpenseIds.length > 0) await refetchExpenses();
          await logActivity('invoice', created.id, 'created', `Invoice ${created.invoiceNumber} created`);
          if (saveAction === 'send') {
            const emails = (clientEmail || '').split(',').map(e => e.trim()).filter(Boolean);
            if (emails.length === 0) {
              toast.warning(`Invoice ${created.invoiceNumber} created, but no client email — nothing to send.`);
            } else {
              const token = created.shareToken || crypto.randomUUID();
              if (!created.shareToken) {
                await supabase.from('invoices').update({ share_token: token }).eq('id', created.id);
              }
              const publicUrl = `${window.location.origin}/public/invoice/${created.id}?token=${token}`;
              const { error: emailErr } = await supabase.functions.invoke('send-invoice-email', {
                body: {
                  emails,
                  invoiceNumber: created.invoiceNumber,
                  clientName: created.clientName,
                  amount: totals.total.toFixed(2),
                  currency: created.currency,
                  dueDate: created.dueDate,
                  publicUrl,
                  companyName: '',
                },
              });
              if (emailErr) {
                toast.error(`Invoice ${created.invoiceNumber} created, but email failed to send`);
                console.error('[CreateInvoice] send-invoice-email error', emailErr);
              } else {
                await logActivity('invoice', created.id, 'emailed', `Emailed to ${emails.join(', ')}`);
                toast.success(`Invoice ${created.invoiceNumber} created & emailed to ${emails.join(', ')}`);
              }
            }
          } else {
            toast.success(`Invoice ${created.invoiceNumber} created successfully`);
          }
          navigate(`/invoices/${created.id}`);
        },
      });
    } else {
      const finalItems = isVatRegistered ? items : items.map(i => ({ ...i, taxRate: 0, taxRateName: undefined }));
      const result = await addRecurring({
        companyId, clientName, clientEmail, clientAddress, currency,
        items: finalItems, taxRate: isVatRegistered ? taxRate : 0, notes,
        frequency, dayOfMonth, nextRunDate, endDate: null, isActive: true,
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
    <AppLayout fullWidth>
      <button
        onClick={() => navigate('/invoices')}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to invoices
      </button>

      <form onSubmit={handleSubmit}>
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {isRecurring ? 'New Recurring Invoice' : 'New Invoice'}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {!clientName ? 'Select a customer to begin.' : !hasLineItems ? 'Add at least one line item.' : isRecurring ? 'Set up automatic invoicing.' : 'Fill in the details below.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 mr-3 px-3 py-1.5 rounded-md bg-muted/50">
              <Switch id="recurring-toggle" checked={isRecurring} onCheckedChange={(v) => { setIsRecurring(v); if (v) setInvoiceType('standard'); }} />
              <Label htmlFor="recurring-toggle" className="text-xs font-medium flex items-center gap-1 cursor-pointer">
                <RefreshCw className="h-3 w-3" /> Recurring
              </Label>
            </div>
            {!isRecurring && (
              <div className="flex items-center gap-2 mr-3 px-3 py-1.5 rounded-md bg-muted/50">
                <Switch id="deposit-toggle" checked={invoiceType === 'deposit'} onCheckedChange={(v) => setInvoiceType(v ? 'deposit' : 'standard')} />
                <Label htmlFor="deposit-toggle" className="text-xs font-medium flex items-center gap-1 cursor-pointer">
                  💰 Deposit
                </Label>
              </div>
            )}
            <Button type="button" variant="outline" size="sm" onClick={() => navigate('/invoices')}>Cancel</Button>
            <Button type="submit" variant="outline" size="sm" disabled={!canSave || saving} onClick={() => setSaveAction('draft')}>
              <Save className="mr-1.5 h-3.5 w-3.5" />
              {saving && saveAction === 'draft' ? 'Saving...' : isRecurring ? 'Create Recurring' : 'Save Draft'}
            </Button>
            {!isRecurring && (
              <Button type="submit" size="sm" disabled={!canSave || saving} onClick={() => setSaveAction('send')}>
                <Send className="mr-1.5 h-3.5 w-3.5" />
                {saving && saveAction === 'send' ? 'Sending...' : 'Save & Send'}
              </Button>
            )}
          </div>
        </div>

        {/* Split pane: Form left, Preview right */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
          {/* LEFT: Form */}
          <div className="space-y-5 min-w-0">
            {/* Customer + Invoice Details side by side */}
            <div className="grid gap-5 md:grid-cols-2">
              {/* Bill To */}
              <div className="rounded-lg border bg-card p-5">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Bill To</h2>
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
                      Credit limit exceeded ({formatCurrency(selectedCustomer.creditLimit, currency)}).
                      {selectedCustomer.blockOnCreditLimit ? ' Blocked.' : ' Proceed with caution.'}
                    </AlertDescription>
                  </Alert>
                )}
                {creditLimitWarning && selectedCustomer && (
                  <Alert className="mt-3 border-yellow-500/50 bg-yellow-500/10">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-700 dark:text-yellow-400">
                      Approaching credit limit ({formatCurrency(outstandingBalance, currency)} / {formatCurrency(selectedCustomer.creditLimit, currency)}).
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Invoice Details */}
              <div className="rounded-lg border bg-card p-5">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Invoice Details</h2>
                <div className="space-y-3">
                  <div className="grid gap-3 grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Company</Label>
                      <p className="h-9 flex items-center px-3 rounded-md border bg-muted/50 text-sm font-medium truncate">
                        {activeCompany?.name || 'No company'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Invoice #</Label>
                      <p className="h-9 flex items-center px-3 rounded-md border bg-muted/50 text-sm font-mono text-muted-foreground">Auto</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Payment Terms</Label>
                    <PaymentTermsSelect value={paymentTerms} onChange={(terms, date) => { setPaymentTerms(terms); if (date) setDueDate(date); }} />
                  </div>
                  <div className="grid gap-3 grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Due Date</Label>
                      <InvoiceDatePicker value={dueDate} onChange={setDueDate} placeholder="Due date" />
                      {dueDate && (() => {
                        const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86400000);
                        return days > 0 ? (
                          <p className="text-xs text-muted-foreground mt-0.5">Due in {days} day{days !== 1 ? 's' : ''}</p>
                        ) : days === 0 ? (
                          <p className="text-xs text-yellow-600 mt-0.5">Due today</p>
                        ) : (
                          <p className="text-xs text-destructive mt-0.5">{Math.abs(days)} day{Math.abs(days) !== 1 ? 's' : ''} past</p>
                        );
                      })()}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Currency</Label>
                      <CurrencySelect value={currency} onChange={setCurrency} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recurring Settings */}
            {isRecurring && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-5">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-primary mb-3 flex items-center gap-2">
                  <RefreshCw className="h-3.5 w-3.5" /> Recurring Settings
                </h2>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
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
                    <div className="space-y-1">
                      <Label className="text-xs">Day of Month</Label>
                      <Input type="number" min={1} max={28} value={dayOfMonth} onChange={e => handleDayOfMonthChange(parseInt(e.target.value) || 1)} className="h-9" />
                    </div>
                  )}
                  <div className="space-y-1">
                    <Label className="text-xs">Start Date</Label>
                    <InvoiceDatePicker value={nextRunDate} onChange={setNextRunDate} placeholder="Next run" />
                  </div>
                </div>
              </div>
            )}

            {/* Deposit Settings */}
            {invoiceType === 'deposit' && !isRecurring && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-5">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-3 flex items-center gap-2">
                  💰 Deposit Settings
                </h2>
                <p className="text-xs text-muted-foreground mb-3">
                  This invoice will be created for the <strong>deposit amount only</strong>. When it's fully paid, a separate <strong>balance invoice</strong> is auto-generated for the remainder.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Deposit Type</Label>
                    <Select value={depositType} onValueChange={v => setDepositType(v as DepositType)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage of Total</SelectItem>
                        <SelectItem value="fixed">Fixed Amount</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{depositType === 'percentage' ? 'Deposit %' : `Amount (${currency})`}</Label>
                    <Input type="number" min={1} max={depositType === 'percentage' ? 99 : undefined} step={depositType === 'percentage' ? 1 : 0.01} value={depositValue} onChange={e => setDepositValue(parseFloat(e.target.value) || 0)} className="h-9" />
                  </div>
                </div>
                {totals.total > 0 && (
                  <div className="mt-3 rounded-md bg-card border p-3 text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Full Job Total</span>
                      <span className="font-medium">{formatCurrency(totals.total, currency)}</span>
                    </div>
                    <div className="flex justify-between text-amber-700 dark:text-amber-400 font-medium">
                      <span>This Invoice (Deposit)</span>
                      <span>{formatCurrency(depositType === 'percentage' ? totals.total * (depositValue / 100) : Math.min(depositValue, totals.total), currency)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground border-t pt-1">
                      <span>Balance Invoice (auto, after deposit paid)</span>
                      <span>{formatCurrency(totals.total - (depositType === 'percentage' ? totals.total * (depositValue / 100) : Math.min(depositValue, totals.total)), currency)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Billable Expenses */}
            <BillableExpenses
              clientName={clientName}
              customerId={selectedCustomer?.id || null}
              currency={currency}
              onAddItems={handleAddBillableExpenses}
            />

            {/* Line Items */}
            <div className="rounded-lg border bg-card p-5" style={{ overflow: 'visible' }}>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Line Items</h2>
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
              <div className="mt-5 border-t pt-4">
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

            {/* Notes */}
            <div className="rounded-lg border bg-card p-5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Notes & Terms</h2>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Payment terms, bank details, thank you message..." rows={3} />
            </div>
          </div>

          {/* RIGHT: Live Preview */}
          <div className="hidden lg:block">
            <div className="sticky top-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Live Preview</p>
              <InvoiceLivePreview
                company={activeCompany as any}
                clientName={clientName}
                clientEmail={clientEmail}
                clientAddress={clientAddress}
                dueDate={dueDate}
                items={items}
                taxRate={taxRate}
                currency={currency}
                notes={notes}
                isVatRegistered={isVatRegistered}
                pricingMode={pricingMode}
              />
            </div>
          </div>
        </div>
      </form>
    </AppLayout>
  );
}
