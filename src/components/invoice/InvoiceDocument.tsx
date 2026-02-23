import type { Invoice, Company } from '@/types/invoice';
import { formatCurrency, calculateSubtotal, calculateTax, calculateTotal } from '@/types/invoice';

interface Props {
  invoice: Invoice;
  company: Company | undefined;
  bankingDetails?: string;
  termsConditions?: string;
}

export default function InvoiceDocument({ invoice, company, bankingDetails, termsConditions }: Props) {
  const hasDiscount = invoice.items.some(i => (i.discount || 0) > 0);

  return (
    <div className="bg-card rounded-lg border invoice-shadow-lg max-w-[800px] mx-auto" id="invoice-document">
      <div className="h-1.5 bg-primary rounded-t-lg" />
      <div className="p-10">
        {/* Header */}
        <div className="flex justify-between items-start mb-10">
          <div>
            {company?.logo ? (
              <img src={company.logo} alt={company.name} className="h-14 w-auto mb-4 object-contain" />
            ) : (
              <h2 className="text-xl font-semibold mb-4">{company?.name || 'Company'}</h2>
            )}
            {company && (
              <div className="text-sm text-muted-foreground space-y-0.5">
                <p className="font-medium text-foreground">{company.name}</p>
                <p>{company.address}</p>
                <p>{company.city}, {company.country}</p>
                <p>{company.email}</p>
                {company.phone && <p>{company.phone}</p>}
                {company.taxNumber && <p className="mono text-xs mt-2">Tax/VAT: {company.taxNumber}</p>}
              </div>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Invoice</p>
            <p className="mono text-lg font-semibold text-foreground">{invoice.invoiceNumber}</p>
            <div className="text-sm text-muted-foreground mt-3 space-y-1">
              <div className="flex justify-end gap-6">
                <span className="text-xs uppercase tracking-wider">Issued</span>
                <span>{new Date(invoice.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-end gap-6">
                <span className="text-xs uppercase tracking-wider">Due</span>
                <span className="font-medium text-foreground">{new Date(invoice.dueDate).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bill To */}
        <div className="mb-8">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Bill To</p>
          <div className="rounded-md bg-muted/40 p-4">
            <p className="font-medium text-foreground">{invoice.clientName}</p>
            {invoice.clientEmail && <p className="text-sm text-muted-foreground">{invoice.clientEmail}</p>}
            {invoice.clientAddress && <p className="text-sm text-muted-foreground whitespace-pre-line mt-1">{invoice.clientAddress}</p>}
          </div>
        </div>

        {/* Items table */}
        <table className="w-full text-sm mb-8">
          <thead>
            <tr className="border-b-2 border-border">
              <th className="py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Description</th>
              <th className="py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground w-16">Qty</th>
              <th className="py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground w-28">Price</th>
              {hasDiscount && <th className="py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground w-20">Disc.</th>}
              <th className="py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground w-28">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item) => {
              const discount = item.discount || 0;
              const lineAmount = item.quantity * item.unitPrice * (1 - discount / 100);
              return (
                <tr key={item.id} className="border-b border-border/50">
                  <td className="py-3 text-foreground">{item.description}</td>
                  <td className="py-3 text-right mono text-muted-foreground">{item.quantity}</td>
                  <td className="py-3 text-right mono text-muted-foreground">{formatCurrency(item.unitPrice, invoice.currency)}</td>
                  {hasDiscount && <td className="py-3 text-right mono text-muted-foreground">{discount > 0 ? `${discount}%` : '—'}</td>}
                  <td className="py-3 text-right mono font-medium text-foreground">{formatCurrency(lineAmount, invoice.currency)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-72 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="mono">{formatCurrency(calculateSubtotal(invoice.items), invoice.currency)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax ({invoice.taxRate}%)</span>
              <span className="mono">{formatCurrency(calculateTax(invoice.items, invoice.taxRate), invoice.currency)}</span>
            </div>
            <div className="flex justify-between text-lg font-semibold border-t-2 border-border pt-3 mt-1">
              <span>Total</span>
              <span className="mono text-primary">{formatCurrency(calculateTotal(invoice.items, invoice.taxRate), invoice.currency)}</span>
            </div>
          </div>
        </div>

        {invoice.notes && (
          <div className="mt-10 pt-6 border-t">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Notes</p>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{invoice.notes}</p>
          </div>
        )}

        {bankingDetails && (
          <div className="mt-6 pt-6 border-t">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Banking Details</p>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{bankingDetails}</p>
          </div>
        )}

        {termsConditions && (
          <div className="mt-6 pt-6 border-t">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Terms & Conditions</p>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{termsConditions}</p>
          </div>
        )}
      </div>
    </div>
  );
}
