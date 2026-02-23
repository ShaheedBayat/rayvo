import type { InvoiceItem, Currency } from '@/types/invoice';
import { formatCurrency, calculateSubtotal, calculateTax, calculateTotal } from '@/types/invoice';
import { Input } from '@/components/ui/input';

interface Props {
  items: InvoiceItem[];
  taxRate: number;
  currency: Currency;
  onTaxRateChange: (rate: number) => void;
}

export default function InvoiceSummary({ items, taxRate, currency, onTaxRateChange }: Props) {
  return (
    <div className="flex justify-end">
      <div className="w-72 space-y-2.5">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="mono font-medium">{formatCurrency(calculateSubtotal(items), currency)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Tax</span>
            <Input
              type="number"
              min={0}
              max={100}
              value={taxRate}
              onChange={(e) => onTaxRateChange(parseFloat(e.target.value) || 0)}
              className="w-14 h-7 text-xs text-center"
            />
            <span className="text-muted-foreground text-xs">%</span>
          </div>
          <span className="mono">{formatCurrency(calculateTax(items, taxRate), currency)}</span>
        </div>
        <div className="flex justify-between text-base font-semibold border-t pt-3">
          <span>Total</span>
          <span className="mono text-primary">
            {formatCurrency(calculateTotal(items, taxRate), currency)}
          </span>
        </div>
      </div>
    </div>
  );
}
