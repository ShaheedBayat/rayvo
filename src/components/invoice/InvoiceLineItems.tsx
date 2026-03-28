import { useState, useRef, useEffect, useCallback } from 'react';
import type { InvoiceItem, Currency } from '@/types/invoice';
import type { Product } from '@/hooks/useProducts';
import type { TaxRate } from '@/hooks/useTaxRates';
import { formatCurrency } from '@/types/invoice';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function ProductSearch({ products, onSelect, value, onChange, onCreateNew, onEnter, inputRef: externalRef }: {
  products?: Product[];
  onSelect: (p: Product) => void;
  value: string;
  onChange: (v: string) => void;
  onCreateNew?: () => void;
  onEnter?: () => void;
  inputRef?: React.RefObject<HTMLInputElement>;
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setOpen(false);
      onEnter?.();
    }
  };

  return (
    <div className="relative overflow-visible" ref={ref} style={{ zIndex: open ? 100 : 'auto' }}>
      <Input
        ref={externalRef}
        required
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => products && products.length > 0 && setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Search"
        className="border-0 shadow-none bg-transparent px-0 h-9 focus-visible:ring-0"
        autoComplete="off"
      />
      {open && (filtered.length > 0 || onCreateNew) && (
        <div className="absolute left-0 top-full mt-1 w-72 rounded-md border bg-popover shadow-lg max-h-72 overflow-y-auto" style={{ zIndex: 9999 }}>
          {filtered.length === 0 && (
            <div className="px-3 py-2 text-xs text-muted-foreground">No matching products</div>
          )}
          {filtered.map(p => (
            <button
              key={p.id}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
              onClick={() => { onSelect(p); setOpen(false); }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">{p.name || p.code}</span>
                  <span className="text-muted-foreground ml-2 text-xs capitalize">{p.type}</span>
                </div>
                <span className="mono text-xs">{p.sellPrice.toFixed(2)}</span>
              </div>
              {p.sellDescription && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">{p.sellDescription}</p>
              )}
            </button>
          ))}
          <div className="border-t" />
          <button
            type="button"
            className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors text-muted-foreground italic"
            onClick={() => setOpen(false)}
          >
            Custom item (type manually)
          </button>
          {onCreateNew && (
            <button
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors text-primary font-medium"
              onClick={() => { onCreateNew(); setOpen(false); }}
            >
              + Create new product
            </button>
          )}
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
  onCreateNewProduct?: () => void;
}

export default function InvoiceLineItems({ items, currency, products, taxRates, isVatRegistered, onAdd, onRemove, onUpdate, onProductSelect, onCreateNewProduct }: Props) {
  const activeTaxRates = (taxRates || []).filter(t => t.active);
  const uniqueTaxRates = activeTaxRates.filter((t, i, arr) => arr.findIndex(r => r.name === t.name) === i);
  const showTaxColumn = isVatRegistered && uniqueTaxRates.length > 0;

  const quantityRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleProductSelect = (itemId: string, product: Product) => {
    onUpdate(itemId, 'description', product.sellDescription || product.name);
    onUpdate(itemId, 'unitPrice', product.sellPrice);
    onUpdate(itemId, 'quantity', 1);
    if (isVatRegistered && product.sellTaxRate !== undefined) {
      onUpdate(itemId, 'taxRate', product.sellTaxRate);
      const matchingRate = uniqueTaxRates.find(t => t.rate === product.sellTaxRate);
      if (matchingRate) {
        onUpdate(itemId, 'taxRateName' as any, matchingRate.name);
      }
    }
    onProductSelect?.(itemId, product);
    // Focus quantity field after selection
    requestAnimationFrame(() => quantityRefs.current[itemId]?.focus());
  };

  return (
    <div>
      <div style={{ overflow: 'visible' }}>
        <table className="w-full text-sm" style={{ overflow: 'visible' }}>
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
          <tbody style={{ overflow: 'visible' }}>
            {items.map((item) => {
              const discount = item.discount || 0;
              const lineAmount = item.quantity * item.unitPrice * (1 - discount / 100);
              return (
                <tr key={item.id} className="border-b last:border-0 group" style={{ overflow: 'visible' }}>
                  <td className="py-2" style={{ overflow: 'visible', position: 'relative' }}>
                    <ProductSearch
                      products={products}
                      value={item.description}
                      onChange={(v) => onUpdate(item.id, 'description', v)}
                      onSelect={(p) => handleProductSelect(item.id, p)}
                      onCreateNew={onCreateNewProduct}
                      onEnter={onAdd}
                    />
                  </td>
                  <td className="py-2">
                    <Input
                      ref={(el) => { quantityRefs.current[item.id] = el; }}
                      type="number"
                      min={1}
                      value={item.quantity || ''}
                      onChange={(e) => onUpdate(item.id, 'quantity', parseInt(e.target.value) || 0)}
                      className="border-0 shadow-none bg-transparent px-0 h-9 text-right focus-visible:ring-0 mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0"
                    />
                  </td>
                  <td className="py-2">
                    <Input type="number" min={0} step="0.01" value={item.unitPrice || ''} onChange={(e) => onUpdate(item.id, 'unitPrice', parseFloat(e.target.value) || 0)} placeholder="0.00" className="border-0 shadow-none bg-transparent px-0 h-9 text-right focus-visible:ring-0 mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                  </td>
                  <td className="py-2">
                    <div className="flex items-center justify-end gap-1">
                      <Input type="number" min={0} max={100} step="0.5" value={discount || ''} onChange={(e) => onUpdate(item.id, 'discount' as any, parseFloat(e.target.value) || 0)} placeholder="0" className="border-0 shadow-none bg-transparent px-0 h-9 text-right focus-visible:ring-0 mono w-16 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
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
