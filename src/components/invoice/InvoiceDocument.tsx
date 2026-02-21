import type { Invoice, Company } from '@/types/invoice';
import { formatCurrency, calculateSubtotal, calculateTax, calculateTotal } from '@/types/invoice';

interface Props {
  invoice: Invoice;
  company: Company | undefined;
}

export default function InvoiceDocument({ invoice, company }: Props) {
  return (
    <div className="bg-card rounded-lg p-10 invoice-shadow-lg max-w-[800px] mx-auto" id="invoice-document">
      {/* Header */}
      <div className="flex justify-between items-start mb-10">
        <div>
          {company?.logo ? (
            <img src={company.logo} alt={company.name} className="h-16 w-auto mb-3 object-contain" />
          ) : (
            <h2 className="text-xl font-semibold mb-3">{company?.name || 'Company'}</h2>
          )}
          {company && (
            <div className="text-sm text-muted-foreground space-y-0.5">
              <p>{company.address}</p>
              <p>{company.city}, {company.country}</p>
              <p>{company.email}</p>
              <p>{company.phone}</p>
              {company.taxNumber && <p className="mono text-xs mt-1">Tax: {company.taxNumber}</p>}
            </div>
          )}
        </div>
        <div className="text-right">
          <h1 className="text-3xl font-bold tracking-tight text-primary mb-2">INVOICE</h1>
          <p className="mono text-sm font-medium">{invoice.invoiceNumber}</p>
          <div className="text-sm text-muted-foreground mt-2 space-y-0.5">
            <p>Date: {new Date(invoice.createdAt).toLocaleDateString()}</p>
            <p>Due: {new Date(invoice.dueDate).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Bill To */}
      <div className="mb-8 rounded-md bg-secondary/50 p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Bill To</p>
        <p className="font-medium">{invoice.clientName}</p>
        {invoice.clientEmail && <p className="text-sm text-muted-foreground">{invoice.clientEmail}</p>}
        {invoice.clientAddress && (
          <p className="text-sm text-muted-foreground whitespace-pre-line mt-1">{invoice.clientAddress}</p>
        )}
      </div>

      {/* Items table */}
      <table className="w-full text-sm mb-6">
        <thead>
          <tr className="border-b-2 border-primary/20">
            <th className="py-3 text-left font-medium text-muted-foreground">Description</th>
            <th className="py-3 text-right font-medium text-muted-foreground w-20">Qty</th>
            <th className="py-3 text-right font-medium text-muted-foreground w-28">Unit Price</th>
            <th className="py-3 text-right font-medium text-muted-foreground w-28">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map(item => (
            <tr key={item.id} className="border-b border-border/50">
              <td className="py-3">{item.description}</td>
              <td className="py-3 text-right mono">{item.quantity}</td>
              <td className="py-3 text-right mono">{formatCurrency(item.unitPrice, invoice.currency)}</td>
              <td className="py-3 text-right mono font-medium">
                {formatCurrency(item.quantity * item.unitPrice, invoice.currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-64 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="mono">{formatCurrency(calculateSubtotal(invoice.items), invoice.currency)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tax ({invoice.taxRate}%)</span>
            <span className="mono">{formatCurrency(calculateTax(invoice.items, invoice.taxRate), invoice.currency)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold border-t-2 border-primary/20 pt-2">
            <span>Total ({invoice.currency})</span>
            <span className="mono text-primary">
              {formatCurrency(calculateTotal(invoice.items, invoice.taxRate), invoice.currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div className="mt-10 pt-6 border-t">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Notes</p>
          <p className="text-sm text-muted-foreground whitespace-pre-line">{invoice.notes}</p>
        </div>
      )}
    </div>
  );
}
