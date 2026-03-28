import { Plus, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Currency, InvoiceItem } from '@/types/invoice';

interface QuoteFormProps {
  editing: boolean;
  clientName: string; setClientName: (v: string) => void;
  clientEmail: string; setClientEmail: (v: string) => void;
  clientAddress: string; setClientAddress: (v: string) => void;
  currency: Currency; setCurrency: (v: Currency) => void;
  taxRate: number; setTaxRate: (v: number) => void;
  notes: string; setNotes: (v: string) => void;
  validUntil: string; setValidUntil: (v: string) => void;
  items: InvoiceItem[]; setItems: (v: InvoiceItem[]) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export default function QuoteForm({
  editing, clientName, setClientName, clientEmail, setClientEmail,
  clientAddress, setClientAddress, currency, setCurrency, taxRate, setTaxRate,
  notes, setNotes, validUntil, setValidUntil, items, setItems, onSubmit, onCancel,
}: QuoteFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4 mt-2">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Customer Name</Label>
          <Input required value={clientName} onChange={e => setClientName(e.target.value)} className="h-9" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Email</Label>
          <Input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} className="h-9" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Address</Label>
        <Textarea value={clientAddress} onChange={e => setClientAddress(e.target.value)} rows={2} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Currency</Label>
          <Select value={currency} onValueChange={v => setCurrency(v as Currency)}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ZAR">ZAR</SelectItem><SelectItem value="USD">USD</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem><SelectItem value="GBP">GBP</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Tax Rate (%)</Label>
          <Input type="number" min={0} max={100} value={taxRate} onChange={e => setTaxRate(parseFloat(e.target.value) || 0)} className="h-9" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Valid Until</Label>
          <Input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} className="h-9" />
        </div>
      </div>
      <div>
        <Label className="text-xs mb-2 block">Line Items</Label>
        {items.map((item, i) => (
          <div key={item.id} className="flex gap-2 mb-2">
            <Input placeholder="Description" value={item.description} onChange={e => { const u = [...items]; u[i] = { ...item, description: e.target.value }; setItems(u); }} className="h-8 text-xs flex-1" />
            <Input type="number" placeholder="Qty" value={item.quantity} onChange={e => { const u = [...items]; u[i] = { ...item, quantity: parseInt(e.target.value) || 0 }; setItems(u); }} className="h-8 text-xs w-16" />
            <Input type="number" placeholder="Price" value={item.unitPrice} onChange={e => { const u = [...items]; u[i] = { ...item, unitPrice: parseFloat(e.target.value) || 0 }; setItems(u); }} className="h-8 text-xs w-24" />
            {items.length > 1 && (
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setItems(items.filter((_, j) => j !== i))}><Trash2 className="h-3 w-3" /></Button>
            )}
          </div>
        ))}
        <Button type="button" variant="ghost" size="sm" className="text-primary text-xs" onClick={() => setItems([...items, { id: uuidv4(), description: '', quantity: 1, unitPrice: 0 }])}>
          <Plus className="h-3 w-3 mr-1" /> Add item
        </Button>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Notes</Label>
        <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{editing ? 'Update Quote' : 'Create Quote'}</Button>
      </div>
    </form>
  );
}
