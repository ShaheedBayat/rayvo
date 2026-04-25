import type { InvoiceItem, Currency, Company } from '@/types/invoice';
import { formatCurrency, calculateSmartTotals } from '@/types/invoice';
import { format } from 'date-fns';

interface Props {
  company: Company | undefined;
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  invoiceNumber?: string;
  dueDate: string;
  items: InvoiceItem[];
  taxRate: number;
  currency: Currency;
  notes: string;
  isVatRegistered: boolean;
  pricingMode: 'exclusive' | 'inclusive';
}

export default function InvoiceLivePreview({
  company, clientName, clientEmail, clientAddress,
  invoiceNumber, dueDate, items, taxRate, currency,
  notes, isVatRegistered, pricingMode
}: Props) {
  const totals = calculateSmartTotals(items, taxRate, pricingMode, isVatRegistered);
  const hasDiscount = items.some(i => (i.discount || 0) > 0);
  const validItems = items.filter(i => i.description.trim());
  const formatDate = (d: string) => {
    try { return format(new Date(d + 'T00:00:00'), 'dd MMM yyyy'); } catch { return d; }
  };

  return (
    <div className="bg-card rounded-lg border shadow-sm overflow-hidden text-xs leading-relaxed">
      {/* Top accent */}
      <div className="h-1 bg-primary" />
      <div className="p-5">
        {/* Header */}
        <div className="flex justify-between items-start mb-5">
          <div>
            {company?.logo ? (
              <img src={company.logo} alt={company.name} className="h-8 w-auto mb-2 object-contain" />
            ) : (
              <p className="text-sm font-semibold mb-2">{company?.name || 'Your Company'}</p>
            )}
            {company && (
              <div className="text-muted-foreground space-y-0.5">
                <p className="font-medium text-foreground text-xs">{company.name}</p>
                <p>{company.address}</p>
                <p>{company.city}, {company.country}</p>
                <p>{company.email}</p>
              </div>
            )}
          </div>
          <div className="text-right">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Invoice</p>
            <p className="font-mono text-sm font-semibold">{invoiceNumber || 'INV-XXXXX'}</p>
            <div className="text-muted-foreground mt-2 space-y-0.5">
              <p>Issued: {formatDate(new Date().toISOString().split('T')[0])}</p>
              <p className="font-medium text-foreground">Due: {dueDate ? formatDate(dueDate) : '—'}</p>
            </div>
          </div>
        </div>

        {/* Bill To */}
        <div className="mb-4">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Bill To</p>
          <div className="bg-muted/40 rounded-md p-2.5">
            <p className="font-medium text-foreground">{clientName || 'Customer name'}</p>
            {clientEmail && <p className="text-muted-foreground">{clientEmail}</p>}
            {clientAddress && <p className="text-muted-foreground whitespace-pre-line">{clientAddress}</p>}
          </div>
        </div>

        {/* Line items */}
        {validItems.length > 0 ? (
          <table className="w-full mb-4">
            <thead>
              <tr className="border-b border-border">
                <th className="py-1.5 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Item</th>
                <th className="py-1.5 text-right text-[10px] font-medium uppercase tracking-wider text-muted-foreground w-8">Qty</th>
                <th className="py-1.5 text-right text-[10px] font-medium uppercase tracking-wider text-muted-foreground w-16">Price</th>
                {hasDiscount && <th className="py-1.5 text-right text-[10px] font-medium uppercase tracking-wider text-muted-foreground w-10">Disc</th>}
                <th className="py-1.5 text-right text-[10px] font-medium uppercase tracking-wider text-muted-foreground w-16">Amount</th>
              </tr>
            </thead>
            <tbody>
              {validItems.map(item => {
                const disc = item.discount || 0;
                const amt = item.quantity * item.unitPrice * (1 - disc / 100);
                return (
                  <tr key={item.id} className="border-b border-border/30">
                    <td className="py-1.5 pr-2 text-foreground break-words align-top">
                      <span className="line-clamp-2">{item.description}</span>
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-muted-foreground align-top">{item.quantity}</td>
                    <td className="py-1.5 text-right tabular-nums text-muted-foreground align-top whitespace-nowrap">{formatCurrency(item.unitPrice, currency)}</td>
                    {hasDiscount && <td className="py-1.5 text-right tabular-nums text-muted-foreground align-top">{disc > 0 ? `${disc}%` : '—'}</td>}
                    <td className="py-1.5 text-right tabular-nums font-medium align-top whitespace-nowrap">{formatCurrency(amt, currency)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="py-6 text-center text-muted-foreground italic">
            Add line items to see preview
          </div>
        )}

        {/* Totals */}
        {validItems.length > 0 && (
          <div className="flex justify-end">
            <div className="w-52 space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="tabular-nums">{formatCurrency(totals.subtotal, currency)}</span>
              </div>
              {isVatRegistered && totals.tax > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">VAT</span>
                  <span className="tabular-nums">{formatCurrency(totals.tax, currency)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-xs border-t pt-1.5">
                <span>Total</span>
                <span className="tabular-nums text-primary">{formatCurrency(totals.total, currency)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        {notes && (
          <div className="mt-4 pt-3 border-t">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Notes</p>
            <p className="text-muted-foreground whitespace-pre-line line-clamp-3">{notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
