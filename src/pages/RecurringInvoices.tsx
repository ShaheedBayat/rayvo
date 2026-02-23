import { useState } from 'react';
import { useRecurringInvoices } from '@/hooks/useRecurringInvoices';
import { useCompanies } from '@/hooks/useInvoiceStore';
import { formatCurrency, calculateTotal } from '@/types/invoice';
import type { Currency, InvoiceItem } from '@/types/invoice';
import { v4 as uuidv4 } from 'uuid';
import { RefreshCw, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
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
import { toast } from 'sonner';

export default function RecurringInvoices() {
  const { recurring, addRecurring, updateRecurring, deleteRecurring } = useRecurringInvoices();
  const { companies } = useCompanies();
  const [open, setOpen] = useState(false);

  // Form state
  const [companyId, setCompanyId] = useState(companies[0]?.id || '');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [currency, setCurrency] = useState<Currency>('ZAR');
  const [taxRate, setTaxRate] = useState(15);
  const [notes, setNotes] = useState('');
  const [frequency, setFrequency] = useState<'monthly' | 'weekly' | 'yearly'>('monthly');
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [nextRunDate, setNextRunDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: uuidv4(), description: '', quantity: 1, unitPrice: 0 },
  ]);

  const resetForm = () => {
    setCompanyId(companies[0]?.id || '');
    setClientName('');
    setClientEmail('');
    setClientAddress('');
    setCurrency('ZAR');
    setTaxRate(15);
    setNotes('');
    setFrequency('monthly');
    setDayOfMonth(1);
    setItems([{ id: uuidv4(), description: '', quantity: 1, unitPrice: 0 }]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) { toast.error('Select a company'); return; }
    if (!clientName) { toast.error('Enter client name'); return; }
    const result = await addRecurring({
      companyId, clientName, clientEmail, clientAddress, currency,
      items, taxRate, notes, frequency, dayOfMonth, nextRunDate, isActive: true,
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

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Recurring Invoices</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Auto-generate invoices on a schedule.
          </p>
        </div>
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
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Company</Label>
                  <Select value={companyId} onValueChange={setCompanyId}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Customer Name</Label>
                  <Input required value={clientName} onChange={e => setClientName(e.target.value)} className="h-9" />
                </div>
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
                <div className="space-y-1.5">
                  <Label className="text-xs">Day of Month</Label>
                  <Input type="number" min={1} max={28} value={dayOfMonth} onChange={e => setDayOfMonth(parseInt(e.target.value) || 1)} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Next Run</Label>
                  <Input type="date" value={nextRunDate} onChange={e => setNextRunDate(e.target.value)} className="h-9" />
                </div>
              </div>

              {/* Line items */}
              <div>
                <Label className="text-xs mb-2 block">Line Items</Label>
                {items.map((item, i) => (
                  <div key={item.id} className="flex gap-2 mb-2">
                    <Input placeholder="Description" value={item.description} onChange={e => {
                      const updated = [...items]; updated[i] = { ...item, description: e.target.value }; setItems(updated);
                    }} className="h-8 text-xs flex-1" />
                    <Input type="number" placeholder="Qty" value={item.quantity} onChange={e => {
                      const updated = [...items]; updated[i] = { ...item, quantity: parseInt(e.target.value) || 0 }; setItems(updated);
                    }} className="h-8 text-xs w-16" />
                    <Input type="number" placeholder="Price" value={item.unitPrice} onChange={e => {
                      const updated = [...items]; updated[i] = { ...item, unitPrice: parseFloat(e.target.value) || 0 }; setItems(updated);
                    }} className="h-8 text-xs w-24" />
                    {items.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setItems(items.filter((_, j) => j !== i))}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="ghost" size="sm" className="text-primary text-xs" onClick={() => setItems([...items, { id: uuidv4(), description: '', quantity: 1, unitPrice: 0 }])}>
                  <Plus className="h-3 w-3 mr-1" /> Add item
                </Button>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Tax Rate (%)</Label>
                <Input type="number" min={0} max={100} value={taxRate} onChange={e => setTaxRate(parseFloat(e.target.value) || 0)} className="h-9 w-24" />
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
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Day</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Next Run</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Amount</th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {recurring.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-secondary/40 transition-colors">
                  <td className="px-4 py-3.5 font-medium">{r.clientName}</td>
                  <td className="px-4 py-3.5 capitalize text-muted-foreground">{r.frequency}</td>
                  <td className="px-4 py-3.5 mono text-muted-foreground">{r.dayOfMonth}</td>
                  <td className="px-4 py-3.5 text-muted-foreground">{new Date(r.nextRunDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3.5 text-right mono font-medium">
                    {formatCurrency(calculateTotal(r.items, r.taxRate), r.currency)}
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
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={async () => {
                        await deleteRecurring(r.id);
                        toast.success('Deleted');
                      }}>
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
    </AppLayout>
  );
}
