import type { InvoiceItem, Currency } from '@/types/invoice';
import { formatCurrency, calculateSubtotal } from '@/types/invoice';

interface Props {
  items: InvoiceItem[];
  taxRate: number;
  currency: Currency;
  onTaxRateChange: (rate: number) => void;
  isVatRegistered?: boolean;
  pricingMode?: 'exclusive' | 'inclusive';
}

// Calculate VAT breakdown by per-line tax rates
function calculateVatBreakdown(items: InvoiceItem[], defaultRate: number, pricingMode: string) {
  const groups: Record<string, { taxable: number; vat: number; rateName: string }> = {};
  
  items.forEach(item => {
    const rate = item.taxRate ?? defaultRate;
    const rateName = item.taxRateName || (rate === 0 ? 'Zero-rated' : `Tax ${rate}%`);
    const discount = item.discount || 0;
    const lineTotal = item.quantity * item.unitPrice * (1 - discount / 100);
    
    const key = `${rate}-${rateName}`;
    if (!groups[key]) groups[key] = { taxable: 0, vat: 0, rateName };
    
    if (pricingMode === 'inclusive' && rate > 0) {
      const taxable = lineTotal / (1 + rate / 100);
      groups[key].taxable += taxable;
      groups[key].vat += lineTotal - taxable;
    } else {
      groups[key].taxable += lineTotal;
      groups[key].vat += lineTotal * (rate / 100);
    }
  });
  
  return groups;
}

export default function InvoiceSummary({ items, taxRate, currency, onTaxRateChange, isVatRegistered = true, pricingMode = 'exclusive' }: Props) {
  const hasPerLineTax = items.some(i => i.taxRate !== undefined);
  const vatBreakdown = calculateVatBreakdown(items, taxRate, pricingMode);
  
  const totalTaxable = Object.values(vatBreakdown).reduce((s, g) => s + g.taxable, 0);
  const totalVat = Object.values(vatBreakdown).reduce((s, g) => s + g.vat, 0);
  const grandTotal = pricingMode === 'inclusive' 
    ? calculateSubtotal(items) // subtotal already includes VAT
    : totalTaxable + totalVat;

  // Calculate total discount amount
  const totalDiscount = items.reduce((sum, item) => {
    const discount = item.discount || 0;
    if (discount <= 0) return sum;
    return sum + item.quantity * item.unitPrice * (discount / 100);
  }, 0);

  if (!isVatRegistered) {
    return (
      <div className="flex justify-end sticky bottom-0 bg-card py-2">
        <div className="w-72 space-y-2.5">
          {totalDiscount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Discount</span>
              <span className="text-destructive">-{formatCurrency(totalDiscount, currency)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold border-t pt-3">
            <span>Total</span>
            <span className="text-primary">
              {formatCurrency(calculateSubtotal(items), currency)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-end sticky bottom-0 bg-card py-2">
      <div className="w-72 space-y-2.5">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal (excl. VAT)</span>
          <span className="font-medium">{formatCurrency(totalTaxable, currency)}</span>
        </div>

        {totalDiscount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Discount</span>
            <span className="text-destructive">-{formatCurrency(totalDiscount, currency)}</span>
          </div>
        )}
        
        {/* VAT breakdown by rate */}
        {Object.entries(vatBreakdown).map(([key, group]) => (
          group.vat !== 0 && (
            <div key={key} className="flex justify-between text-sm">
              <span className="text-muted-foreground">VAT — {group.rateName}</span>
              <span className="">{formatCurrency(group.vat, currency)}</span>
            </div>
          )
        ))}
        
        {!hasPerLineTax && totalVat > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">VAT ({taxRate}%)</span>
            <span className="">{formatCurrency(totalVat, currency)}</span>
          </div>
        )}
        
        <div className="flex justify-between text-lg font-bold border-t pt-3">
          <span>Total incl. VAT</span>
          <span className="text-primary">
            {formatCurrency(grandTotal, currency)}
          </span>
        </div>
      </div>
    </div>
  );
}
