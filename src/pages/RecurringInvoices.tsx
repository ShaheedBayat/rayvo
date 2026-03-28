import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useRecurringInvoices } from '@/hooks/useRecurringInvoices';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useCompanies } from '@/hooks/useInvoiceStore';
import { useCustomers } from '@/hooks/useCustomers';
import { useProducts } from '@/hooks/useProducts';
import { useTaxRates } from '@/hooks/useTaxRates';
import { formatCurrency, calculateSmartTotals } from '@/types/invoice';
import type { Currency, InvoiceItem } from '@/types/invoice';
import { ArrowLeft, RefreshCw, Plus, Trash2, ToggleLeft, ToggleRight, Calendar, Clock, Loader2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/components/AppLayout';
import InvoiceLineItems from '@/components/invoice/InvoiceLineItems';
import InvoiceSummary from '@/components/invoice/InvoiceSummary';
import CustomerCombobox from '@/components/invoice/CustomerCombobox';
import { toast } from 'sonner';

export default function RecurringInvoices() {
  const navigate = useNavigate();
  const { recurring: allRecurring, addRecurring, updateRecurring, deleteRecurring, processRecurring } = useRecurringInvoices();
  const { companies } = useCompanies();
  const { activeCompany, activeCompanyId } = useActiveCompany();
  const { customers } = useCustomers();
  const { products } = useProducts();
  const companyId = activeCompanyId || '';
  const isVatRegistered = activeCompany?.isVatRegistered ?? false;
  const pricingMode = activeCompany?.pricingMode || 'exclusive';
  const { taxRates, ensureDefaults } = useTaxRates(companyId);
  const recurring = activeCompanyId ? allRecurring.filter(r => r.companyId === activeCompanyId) : allRecurring;
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const defaultRate = isVatRegistered ? (activeCompany?.vatRate ?? 15) : 0;

  // Ensure default tax rates
  useEffect(() => {
    if (isVatRegistered && companyId) ensureDefaults();
  }, [isVatRegistered, companyId, ensureDefaults]);

  // Process recurring invoices on page load
  useEffect(() => {
    const run = async () => {
      setProcessing(true);
      const result = await processRecurring();
      if (result.created > 0) {
        toast.success(`${result.created} invoice${result.created > 1 ? 's' : ''} generated from recurring schedules`);
      }
      setProcessing(false);
    };
    run();
  }, [processRecurring]);

  // --- Form state (mirrors CreateInvoice) ---
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [currency, setCurrency] = useState<Currency>('ZAR');
  const [taxRate, setTaxRate] = useState(defaultRate);
  const [notes, setNotes] = useState('');
  const [frequency, setFrequency] = useState<'monthly' | 'weekly' | 'yearly'>('monthly');
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [nextRunDate, setNextRunDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });

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
  };

  const totals = calculateSmartTotals(items, taxRate, pricingMode, isVatRegistered);
  const hasLineItems = items.some(i => i.description.trim() && i.unitPrice > 0);
  const canSave = clientName.trim() !== '' && hasLineItems;

  const resetForm = () => {
    setClientName(''); setClientEmail(''); setClientAddress('');
    setCurrency('ZAR'); setTaxRate(defaultRate); setNotes('');
    setFrequency('monthly'); setDayOfMonth(1);
    setItems([makeDefaultItem()]);
    const d = new Date(); d.setMonth(d.getMonth() + 1); d.setDate(1);
    setNextRunDate(d.toISOString().split('T')[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) { toast.error('Please add a company first.'); return; }
    if (!clientName) { toast.error('Select a customer.'); return; }
    if (!hasLineItems) { toast.error('Add at least one line item.'); return; }
    const finalItems = isVatRegistered ? items : items.map(i => ({ ...i, taxRate: 0, taxRateName: undefined }));
    const result = await addRecurring({
      companyId, clientName, clientEmail, clientAddress, currency,
      items: finalItems, taxRate: isVatRegistered ? taxRate : 0,
      notes, frequency, dayOfMonth, nextRunDate, isActive: true,
    });
    if (result) {
      toast.success('Recurring invoice created');
      resetForm();
      setShowForm(false);
    } else {
      toast.error('Failed to create');
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    await updateRecurring(id, { isActive: !current });
    toast.success(!current ? 'Activated' : 'Paused');
  };

  const handleManualProcess = async () => {
    setProcessing(true);
    const result = await processRecurring();
    if (result.created > 0) {
      toast.success(`${result.created} invoice${result.created > 1 ? 's' : ''} generated`);
    } else {
      toast.info('No recurring invoices are due yet');
    }
    setProcessing(false);
  };

  // --- Creation form (full page, mirrors CreateInvoice) ---
  if (showForm) {
    return (
      <AppLayout>
        <button
          onClick={() => setShowForm(false)}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to recurring invoices
        </button>

        <form onSubmit={handleSubmit}>
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-2xl font-semibold">New Recurring Invoice</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {!clientName ? 'Select a customer to begin.' : !hasLineItems ? 'Add at least one line item.' : 'Set up automatic invoicing on a schedule.'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" disabled={!canSave}>Create Recurring</Button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-6">
              {/* Schedule & Details */}
              <div className="rounded-lg border bg-card p-6 invoice-shadow">
                <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4">Schedule & Details</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Company</Label>
                    <p className="h-9 flex items-center px-3 rounded-md border bg-muted/50 text-sm font-medium">
                      {activeCompany?.name || 'No company selected'}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Frequency</Label>
                    <Select value={frequency} onValueChange={v => setFrequency(v as any)}>
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
                      <Input type="number" min={1} max={28} value={dayOfMonth} onChange={e => setDayOfMonth(parseInt(e.target.value) || 1)} className="h-9" />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label className="text-xs">First Run Date</Label>
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
                  <div className="space-y-1.5">
                    <Label className="text-xs">Currency</Label>
                    <Select value={currency} onValueChange={v => setCurrency(v as Currency)}>
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

              {/* Line Items — same component as CreateInvoice */}
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

              {/* Notes */}
              <div className="rounded-lg border bg-card p-6 invoice-shadow">
                <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4">Notes & Terms</h2>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Payment terms, bank details, thank you message..." rows={3} />
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
              </div>

              <div className="rounded-lg border bg-primary/5 p-6 invoice-shadow">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Recurring Summary</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Frequency</span>
                    <span className="capitalize">{frequency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">First Run</span>
                    <span>{new Date(nextRunDate).toLocaleDateString()}</span>
                  </div>
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
                    <span>Total per invoice</span>
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

  // --- List view ---
  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Recurring Invoices</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Auto-generate invoices on a schedule.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleManualProcess} disabled={processing} className="gap-1.5">
            {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Process Now
          </Button>
          <Button className="gap-1.5" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" /> New Recurring
          </Button>
        </div>
      </div>

      {recurring.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20">
          <RefreshCw className="h-10 w-10 text-muted-foreground/40" />
          <h3 className="mt-4 text-lg font-medium">No recurring invoices</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm text-center">
            Set up automatic invoicing for repeat clients.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card invoice-shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Frequency</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Next Run</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Last Generated</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Amount</th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {recurring.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-secondary/40 transition-colors">
                  <td className="px-4 py-3.5 font-medium">{r.clientName}</td>
                  <td className="px-4 py-3.5 capitalize text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {r.frequency}
                      {r.frequency === 'monthly' && <span className="text-xs text-muted-foreground/70">(day {r.dayOfMonth})</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(r.nextRunDate).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground">
                    {r.lastGeneratedAt
                      ? new Date(r.lastGeneratedAt).toLocaleDateString()
                      : <span className="text-muted-foreground/50 italic">Never</span>
                    }
                  </td>
                  <td className="px-4 py-3.5 text-right mono font-medium">
                    {(() => {
                      const company = companies.find(c => c.id === r.companyId);
                      const total = calculateSmartTotals(r.items, r.taxRate, company?.pricingMode || 'exclusive', company?.isVatRegistered ?? false).total;
                      return formatCurrency(total, r.currency);
                    })()}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <Badge variant="outline" className={r.isActive ? 'bg-success/10 text-success border-success/20' : 'bg-muted text-muted-foreground'}>
                      {r.isActive ? 'Active' : 'Paused'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleActive(r.id, r.isActive)}>
                        {r.isActive ? <ToggleRight className="h-4 w-4 text-success" /> : <ToggleLeft className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(r.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete recurring invoice?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this recurring invoice schedule.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={async () => { if (deleteId) { await deleteRecurring(deleteId); toast.success('Deleted'); setDeleteId(null); } }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
