import { useState, useEffect } from 'react';
import { useRecurringInvoices } from '@/hooks/useRecurringInvoices';
import { useCompanies } from '@/hooks/useInvoiceStore';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useCustomers } from '@/hooks/useCustomers';
import { useProducts } from '@/hooks/useProducts';
import { useTaxRates } from '@/hooks/useTaxRates';
import { formatCurrency, calculateSmartTotals } from '@/types/invoice';
import type { Currency, InvoiceItem } from '@/types/invoice';
import { v4 as uuidv4 } from 'uuid';
import { RefreshCw, Plus, Trash2, ToggleLeft, ToggleRight, Calendar, Clock, Loader2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import AppLayout from '@/components/AppLayout';
import CustomerCombobox from '@/components/invoice/CustomerCombobox';
import { toast } from 'sonner';

export default function RecurringInvoices() {
  const { recurring: allRecurring, addRecurring, updateRecurring, deleteRecurring, processRecurring } = useRecurringInvoices();
  const { companies } = useCompanies();
  const { activeCompany, activeCompanyId } = useActiveCompany();
  const { customers } = useCustomers();
  const { products } = useProducts();
  const companyId = activeCompanyId || '';
  const isVatRegistered = activeCompany?.isVatRegistered ?? false;
  const { taxRates, ensureDefaults } = useTaxRates(companyId);
  const recurring = activeCompanyId ? allRecurring.filter(r => r.companyId === activeCompanyId) : allRecurring;
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

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

  // Form state
  const defaultRate = isVatRegistered ? (activeCompany?.vatRate ?? 15) : 0;
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [currency, setCurrency] = useState<Currency>('ZAR');
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

  const resetForm = () => {
    setClientName('');
    setClientEmail('');
    setClientAddress('');
    setCurrency('ZAR');
    setNotes('');
    setFrequency('monthly');
    setDayOfMonth(1);
    setItems([makeDefaultItem()]);
  };

  const handleCustomerSelect = (customer: { name: string; email: string; address: string; currency?: string }) => {
    setClientName(customer.name);
    setClientEmail(customer.email);
    setClientAddress(customer.address);
    if (customer.currency) setCurrency(customer.currency as Currency);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) { toast.error('Select a company first'); return; }
    if (!clientName) { toast.error('Select a customer'); return; }
    if (!items.some(i => i.description.trim() && i.unitPrice > 0)) { toast.error('Add at least one line item'); return; }
    const result = await addRecurring({
      companyId, clientName, clientEmail, clientAddress, currency,
      items, taxRate: defaultRate, notes, frequency, dayOfMonth, nextRunDate, isActive: true,
    });
    if (result) {
      toast.success('Recurring invoice created');
      resetForm();
      setOpen(false);
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
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1.5">
                <Plus className="h-4 w-4" /> New Recurring
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New Recurring Invoice</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-2">
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

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Email</Label>
                    <Input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Currency</Label>
                    <Select value={currency} onValueChange={v => setCurrency(v as Currency)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ZAR">ZAR</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Address</Label>
                  <Textarea value={clientAddress} onChange={e => setClientAddress(e.target.value)} rows={2} />
                </div>

                {/* Schedule */}
                <div className="grid gap-3 sm:grid-cols-3">
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
                  </div>
                </div>

                {/* Line items */}
                <div>
                  <Label className="text-xs mb-2 block">Line Items</Label>
                  {items.map((item, i) => (
                    <div key={item.id} className="flex gap-2 mb-2 items-center">
                      <Input placeholder="Description" value={item.description} onChange={e => {
                        const updated = [...items]; updated[i] = { ...item, description: e.target.value }; setItems(updated);
                      }} className="h-8 text-xs flex-1" />
                      <Input type="number" placeholder="Qty" value={item.quantity || ''} onChange={e => {
                        const updated = [...items]; updated[i] = { ...item, quantity: parseInt(e.target.value) || 0 }; setItems(updated);
                      }} className="h-8 text-xs w-16 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                      <Input type="number" placeholder="Price" value={item.unitPrice || ''} onChange={e => {
                        const updated = [...items]; updated[i] = { ...item, unitPrice: parseFloat(e.target.value) || 0 }; setItems(updated);
                      }} className="h-8 text-xs w-24 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                      {isVatRegistered && (
                        <div className="relative w-20">
                          <Input type="number" min={0} max={100} step={0.01} value={item.taxRate ?? defaultRate} onChange={e => {
                            const rate = parseFloat(e.target.value) || 0;
                            const updated = [...items]; updated[i] = { ...item, taxRate: rate, taxRateName: rate === 0 ? 'Zero-rated' : `Tax ${rate}%` }; setItems(updated);
                          }} className="h-8 text-xs pr-5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">%</span>
                        </div>
                      )}
                      {items.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setItems(items.filter((_, j) => j !== i))}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button type="button" variant="ghost" size="sm" className="text-primary text-xs" onClick={() => setItems([...items, makeDefaultItem()])}>
                    <Plus className="h-3 w-3 mr-1" /> Add item
                  </Button>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Notes</Label>
                  <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit">Create Recurring</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
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
