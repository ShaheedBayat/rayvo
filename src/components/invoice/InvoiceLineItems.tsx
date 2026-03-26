import { useState, useRef, useEffect } from 'react';
import type { InvoiceItem, Currency } from '@/types/invoice';
import type { Product } from '@/hooks/useProducts';
import type { TaxRate } from '@/hooks/useTaxRates';
import { formatCurrency } from '@/types/invoice';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function ProductSearch({ products, onSelect, value, onChange }: {
  products?: Product[];
  onSelect: (p: Product) => void;
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = (products || [])
    .filter(p => p.sellEnabled && (
      p.name.toLowerCase().includes(value.toLowerCase()) ||
      p.sellDescription.toLowerCase().includes(value.toLowerCase()) ||
      p.code.toLowerCase().includes(value.toLowerCase())
    ))
    .slice(0, 6);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <Input
        required
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => products && products.length > 0 && setOpen(true)}
        placeholder="Service or product description"
        className="border-0 shadow-none bg-transparent px-0 h-9 focus-visible:ring-0"
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-64 rounded-md border bg-popover shadow-md max-h-40 overflow-y-auto">
          {filtered.map(p => (
            <button
              key={p.id}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
              onClick={() => { onSelect(p); setOpen(false); }}
            >
              <span className="font-medium">{p.code}</span>
              <span className="text-muted-foreground ml-2 text-xs">{p.name || p.sellDescription}</span>
              <span className="float-right mono text-xs">{p.sellPrice.toFixed(2)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface Props {
  items: InvoiceItem[];
  currency: Currency;
  products?: Product[];
  taxRates?: TaxRate[];
  isVatRegistered?: boolean;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, field: keyof InvoiceItem, value: string | number) => void;
  onProductSelect?: (itemId: string, product: Product) => void;
}

export default function InvoiceLineItems({ items, currency, products, taxRates, isVatRegistered, onAdd, onRemove, onUpdate, onProductSelect }: Props) {
  const handleProductSelect = (itemId: string, product: Product) => {
    onUpdate(itemId, 'description', product.sellDescription || product.name);
    onUpdate(itemId, 'unitPrice', product.sellPrice);
    // Flow the product's sell tax rate into the line item when VAT registered
    if (isVatRegistered && product.sellTaxRate !== undefined) {
      onUpdate(itemId, 'taxRate', product.sellTaxRate);
      // Try to find matching tax rate name from available rates
      const matchingRate = (taxRates || []).find(t => t.rate === product.sellTaxRate && t.active);
      if (matchingRate) {
        onUpdate(itemId, 'taxRateName' as any, matchingRate.name);
      }
    }
    onProductSelect?.(itemId, product);
  };

  // Deduplicate tax rates by name to prevent repeated options
  const activeTaxRates = (taxRates || []).filter(t => t.active);
  const uniqueTaxRates = activeTaxRates.filter((t, i, arr) => arr.findIndex(r => r.name === t.name) === i);
  const showTaxColumn = isVatRegistered && uniqueTaxRates.length > 0;

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Description</th>
              <th className="py-2.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground w-20">Qty</th>
              <th className="py-2.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground w-32">Unit Price</th>
              <th className="py-2.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground w-24">Discount</th>
              {showTaxColumn && (
                <th className="py-2.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground w-36">Tax Rate</th>
              )}
              <th className="py-2.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground w-32">Amount</th>
              <th className="py-2.5 w-10" />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const discount = item.discount || 0;
              const lineAmount = item.quantity * item.unitPrice * (1 - discount / 100);
              return (
                <tr key={item.id} className="border-b last:border-0 group">
                  <td className="py-2">
                    <ProductSearch
                      products={products}
                      value={item.description}
                      onChange={(v) => onUpdate(item.id, 'description', v)}
                      onSelect={(p) => handleProductSelect(item.id, p)}
                    />
                  </td>
                  <td className="py-2">
                    <Input type="number" min={1} value={item.quantity} onChange={(e) => onUpdate(item.id, 'quantity', parseInt(e.target.value) || 0)} className="border-0 shadow-none bg-transparent px-0 h-9 text-right focus-visible:ring-0 mono" />
                  </td>
                  <td className="py-2">
                    <Input type="number" min={0} step="0.01" value={item.unitPrice} onChange={(e) => onUpdate(item.id, 'unitPrice', parseFloat(e.target.value) || 0)} className="border-0 shadow-none bg-transparent px-0 h-9 text-right focus-visible:ring-0 mono" />
                  </td>
                  <td className="py-2">
                    <div className="flex items-center justify-end gap-1">
                      <Input type="number" min={0} max={100} step="0.5" value={discount} onChange={(e) => onUpdate(item.id, 'discount' as any, parseFloat(e.target.value) || 0)} className="border-0 shadow-none bg-transparent px-0 h-9 text-right focus-visible:ring-0 mono w-16" />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                  </td>
                  {showTaxColumn && (
                    <td className="py-2">
                      <Select
                        value={item.taxRateName || uniqueTaxRates[0]?.name || ''}
                        onValueChange={(v) => {
                          const selected = uniqueTaxRates.find(t => t.name === v);
                          if (selected) {
                            onUpdate(item.id, 'taxRate', selected.rate);
                            onUpdate(item.id, 'taxRateName' as any, selected.name);
                          }
                        }}
                      >
                        <SelectTrigger className="border-0 shadow-none bg-transparent h-9 focus:ring-0 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {uniqueTaxRates.map(t => (
                            <SelectItem key={t.name} value={t.name}>
                              {t.name} ({t.rate}%)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  )}
                  <td className="py-2 text-right mono font-medium text-sm pr-2">
                    {formatCurrency(lineAmount, currency)}
                  </td>
                  <td className="py-2">
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => onRemove(item.id)} disabled={items.length === 1}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Button type="button" variant="ghost" size="sm" className="mt-2 text-primary" onClick={onAdd}>
        <Plus className="mr-1.5 h-4 w-4" /> Add line item
      </Button>
    </div>
  );
}
