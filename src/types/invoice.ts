export type Currency = 'ZAR' | 'USD' | 'EUR' | 'GBP';

export interface Company {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  taxNumber?: string;
  logo?: string; // base64 data URL
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount?: number; // percentage discount
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  companyId: string;
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  currency: Currency;
  items: InvoiceItem[];
  taxRate: number;
  notes: string;
  status: 'draft' | 'approved' | 'sent' | 'paid';
  createdAt: string;
  dueDate: string;
  shareToken?: string;
}

export const currencySymbols: Record<Currency, string> = {
  ZAR: 'R',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

export function formatCurrency(amount: number, currency: Currency): string {
  const symbol = currencySymbols[currency];
  return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function calculateSubtotal(items: InvoiceItem[]): number {
  return items.reduce((sum, item) => {
    const lineTotal = item.quantity * item.unitPrice;
    const discount = item.discount || 0;
    return sum + lineTotal * (1 - discount / 100);
  }, 0);
}

export function calculateTax(items: InvoiceItem[], taxRate: number): number {
  return calculateSubtotal(items) * (taxRate / 100);
}

export function calculateTotal(items: InvoiceItem[], taxRate: number): number {
  return calculateSubtotal(items) + calculateTax(items, taxRate);
}
