export type Currency = 'ZAR' | 'USD' | 'EUR' | 'GBP' | 'AED' | 'AUD' | 'CAD' | 'CHF' | 'CNY' | 'INR' | 'JPY' | 'NGN' | 'BWP' | 'KES' | 'MZN' | 'NAD';

export type PricingMode = 'exclusive' | 'inclusive';

export interface Company {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  taxNumber?: string;
  logo?: string;
  isVatRegistered?: boolean;
  vatRate?: number;
  pricingMode?: PricingMode;
  defaultCurrency?: Currency;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount?: number; // percentage discount
  taxRate?: number; // per-line tax rate
  taxRateName?: string; // name of the tax rate applied
}

export type InvoiceType = 'standard' | 'deposit' | 'balance';
export type DepositType = 'percentage' | 'fixed';

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
  status: 'draft' | 'approved' | 'sent' | 'paid' | 'voided' | 'partially_paid' | 'credited' | 'awaiting_approval';
  createdAt: string;
  dueDate: string;
  shareToken?: string;
  invoiceType?: InvoiceType;
  depositType?: DepositType;
  depositValue?: number;
  parentInvoiceId?: string;
  /** For deposit invoices: the full job total this deposit was calculated against. */
  jobTotal?: number;
}

export const currencySymbols: Record<Currency, string> = {
  ZAR: 'R',
  USD: '$',
  EUR: '€',
  GBP: '£',
  AED: 'د.إ',
  AUD: 'A$',
  CAD: 'C$',
  CHF: 'CHF',
  CNY: '¥',
  INR: '₹',
  JPY: '¥',
  NGN: '₦',
  BWP: 'P',
  KES: 'KSh',
  MZN: 'MT',
  NAD: 'N$',
};

export const currencyLabels: Record<Currency, string> = {
  ZAR: 'ZAR — South African Rand',
  USD: 'USD — US Dollar',
  EUR: 'EUR — Euro',
  GBP: 'GBP — British Pound',
  AED: 'AED — UAE Dirham',
  AUD: 'AUD — Australian Dollar',
  CAD: 'CAD — Canadian Dollar',
  CHF: 'CHF — Swiss Franc',
  CNY: 'CNY — Chinese Yuan',
  INR: 'INR — Indian Rupee',
  JPY: 'JPY — Japanese Yen',
  NGN: 'NGN — Nigerian Naira',
  BWP: 'BWP — Botswana Pula',
  KES: 'KES — Kenyan Shilling',
  MZN: 'MZN — Mozambican Metical',
  NAD: 'NAD — Namibian Dollar',
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

/**
 * Smart total calculation that respects per-line tax rates and pricing modes.
 * Use this for all display totals throughout the app.
 */
export function calculateSmartTotals(
  items: InvoiceItem[],
  defaultTaxRate: number,
  pricingMode: PricingMode = 'exclusive',
  isVatRegistered: boolean = true
): { subtotal: number; tax: number; total: number } {
  if (!isVatRegistered) {
    const sub = calculateSubtotal(items);
    return { subtotal: sub, tax: 0, total: sub };
  }

  let subtotal = 0;
  let totalTax = 0;

  items.forEach(item => {
    const rate = item.taxRate ?? defaultTaxRate;
    const discount = item.discount || 0;
    const lineTotal = item.quantity * item.unitPrice * (1 - discount / 100);

    if (pricingMode === 'inclusive' && rate > 0) {
      const taxable = lineTotal / (1 + rate / 100);
      subtotal += taxable;
      totalTax += lineTotal - taxable;
    } else {
      subtotal += lineTotal;
      totalTax += lineTotal * (rate / 100);
    }
  });

  return { subtotal, tax: totalTax, total: subtotal + totalTax };
}
