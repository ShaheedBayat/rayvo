import { calculateSmartTotals } from '@/types/invoice';
import type { Currency, InvoiceItem, PricingMode } from '@/types/invoice';

export type StatementEntryType = 'Invoice' | 'Payment' | 'Credit Note';

export interface StatementEntry {
  date: string;
  ref: string;
  type: StatementEntryType;
  amount: number;
  currency: Currency;
  sortAt: string;
}

export interface StatementTotals {
  entries: StatementEntry[];
  runningBalances: number[];
  totalInvoices: number;
  totalPayments: number;
  totalCredits: number;
  balance: number;
  invoiceCount: number;
  currency: Currency;
}

type CompanyLike = {
  id?: string | null;
  pricingMode?: PricingMode | null;
  pricing_mode?: PricingMode | null;
  isVatRegistered?: boolean | null;
  is_vat_registered?: boolean | null;
};

type InvoiceLike = {
  id: string;
  invoiceNumber?: string | null;
  invoice_number?: string | null;
  companyId?: string | null;
  company_id?: string | null;
  clientName?: string | null;
  client_name?: string | null;
  items?: InvoiceItem[] | unknown;
  taxRate?: number | string | null;
  tax_rate?: number | string | null;
  currency?: Currency | string | null;
  status?: string | null;
  createdAt?: string | null;
  created_at?: string | null;
  deleted_at?: string | null;
};

type PaymentLike = {
  id?: string;
  invoiceId?: string | null;
  invoice_id?: string | null;
  amount?: number | string | null;
  paymentDate?: string | null;
  payment_date?: string | null;
  reference?: string | null;
  createdAt?: string | null;
  created_at?: string | null;
};

type CreditNoteLike = {
  id?: string;
  creditNoteNumber?: string | null;
  credit_note_number?: string | null;
  companyId?: string | null;
  company_id?: string | null;
  invoiceId?: string | null;
  invoice_id?: string | null;
  clientName?: string | null;
  client_name?: string | null;
  items?: InvoiceItem[] | unknown;
  taxRate?: number | string | null;
  tax_rate?: number | string | null;
  currency?: Currency | string | null;
  status?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  created_at?: string | null;
  deleted_at?: string | null;
};

export const normalizeStatementName = (value: string | undefined | null) =>
  (value || '').trim().toLowerCase().replace(/\s+/g, ' ');

const normalizeCompanyId = (value: string | undefined | null) => value || '';

const isDraftOrVoidedInvoice = (status: string | undefined | null) => status === 'draft' || status === 'voided';

const isDraftCreditNote = (status: string | undefined | null) => status === 'draft';

export const isOverpaymentCreditNote = (creditNote: { notes?: string | null }) =>
  (creditNote.notes || '').toLowerCase().includes('auto-generated from overpayment');

export const getAppliedCreditSourceNumber = (creditNote: { notes?: string | null }) => {
  const match = (creditNote.notes || '').match(/^applied from credit note\s+(.+)$/i);
  return match?.[1]?.trim() || null;
};

const creditNumber = (creditNote: CreditNoteLike) => creditNote.creditNoteNumber ?? creditNote.credit_note_number ?? '';
const creditCompanyId = (creditNote: CreditNoteLike) => normalizeCompanyId(creditNote.companyId ?? creditNote.company_id);
const creditCreatedAt = (creditNote: CreditNoteLike) => creditNote.createdAt ?? creditNote.created_at ?? '';
const invoiceCompanyId = (invoice: InvoiceLike) => normalizeCompanyId(invoice.companyId ?? invoice.company_id);
const invoiceClientName = (invoice: InvoiceLike) => invoice.clientName ?? invoice.client_name ?? '';
const invoiceCreatedAt = (invoice: InvoiceLike) => invoice.createdAt ?? invoice.created_at ?? '';
const paymentInvoiceId = (payment: PaymentLike) => payment.invoiceId ?? payment.invoice_id ?? '';
const paymentCreatedAt = (payment: PaymentLike) => payment.createdAt ?? payment.created_at ?? payment.paymentDate ?? payment.payment_date ?? '';
const paymentDate = (payment: PaymentLike) => payment.paymentDate ?? payment.payment_date ?? paymentCreatedAt(payment);

const toItems = (items: unknown): InvoiceItem[] => Array.isArray(items) ? (items as InvoiceItem[]) : [];
const toNumber = (value: number | string | null | undefined) => Number(value || 0);
const toCurrency = (value: Currency | string | null | undefined): Currency => (value || 'ZAR') as Currency;

const getCompanyContext = (company: CompanyLike | undefined | null) => ({
  pricingMode: (company?.pricingMode ?? company?.pricing_mode ?? 'exclusive') as PricingMode,
  isVatRegistered: company?.isVatRegistered ?? company?.is_vat_registered ?? false,
});

const calculateDocumentTotal = (
  document: { items?: InvoiceItem[] | unknown; taxRate?: number | string | null; tax_rate?: number | string | null },
  company: CompanyLike | undefined | null
) => {
  const context = getCompanyContext(company);
  return calculateSmartTotals(toItems(document.items), toNumber(document.taxRate ?? document.tax_rate), context.pricingMode, context.isVatRegistered).total;
};

const isWithinDateRange = (dateValue: string, dateFrom?: string, dateTo?: string) => {
  if (!dateValue) return true;
  const time = new Date(dateValue).getTime();
  if (dateFrom && time < new Date(`${dateFrom}T00:00:00`).getTime()) return false;
  if (dateTo && time > new Date(`${dateTo}T23:59:59.999`).getTime()) return false;
  return true;
};

const findCreditSource = <T extends CreditNoteLike>(creditNote: T, allCreditNotes: T[] = []) => {
  const sourceNumber = getAppliedCreditSourceNumber(creditNote);
  if (!sourceNumber) return null;
  const companyId = creditCompanyId(creditNote);
  return allCreditNotes.find(cn => creditNumber(cn) === sourceNumber && creditCompanyId(cn) === companyId) || null;
};

export const countsAsInvoiceCredit = <T extends CreditNoteLike>(creditNote: T) => {
  if (isDraftCreditNote(creditNote.status)) return false;
  return !isOverpaymentCreditNote(creditNote);
};

export const countsAsStatementCredit = <T extends CreditNoteLike>(creditNote: T, allCreditNotes: T[] = []) => {
  if (isDraftCreditNote(creditNote.status)) return false;
  if (isOverpaymentCreditNote(creditNote)) {
    return false;
  }

  const source = findCreditSource(creditNote, allCreditNotes);
  if (!getAppliedCreditSourceNumber(creditNote)) return true;

  return !source || source.status === 'partially_applied';
};

export const calculateInvoiceCredits = <T extends CreditNoteLike>(
  creditNotes: T[],
  company: CompanyLike | undefined | null
) => creditNotes
  .filter(countsAsInvoiceCredit)
  .reduce((sum, creditNote) => sum + calculateDocumentTotal(creditNote, company), 0);

export function buildCustomerStatement<Invoice extends InvoiceLike, Payment extends PaymentLike, CreditNote extends CreditNoteLike>(params: {
  customerName: string;
  companyId?: string | null;
  invoices: Invoice[];
  payments: Payment[];
  creditNotes: CreditNote[];
  getCompany: (companyId: string) => CompanyLike | undefined | null;
  dateFrom?: string;
  dateTo?: string;
}): StatementTotals {
  const targetName = normalizeStatementName(params.customerName);
  const targetCompanyId = normalizeCompanyId(params.companyId);

  const scopedInvoices = params.invoices.filter(invoice =>
    normalizeStatementName(invoiceClientName(invoice)) === targetName &&
    invoiceCompanyId(invoice) === targetCompanyId &&
    !isDraftOrVoidedInvoice(invoice.status) &&
    !invoice.deleted_at
  );

  const scopedInvoiceIds = new Set(scopedInvoices.map(invoice => invoice.id));
  const scopedCreditNotes = params.creditNotes.filter(creditNote =>
    normalizeStatementName(creditNote.clientName ?? creditNote.client_name) === targetName &&
    creditCompanyId(creditNote) === targetCompanyId &&
    !creditNote.deleted_at
  );

  const entries: StatementEntry[] = [];
  let totalInvoices = 0;
  let totalPayments = 0;
  let totalCredits = 0;
  let currency: Currency = toCurrency(scopedInvoices[0]?.currency ?? scopedCreditNotes[0]?.currency);

  scopedInvoices.forEach(invoice => {
    const createdAt = invoiceCreatedAt(invoice);
    const company = params.getCompany(invoiceCompanyId(invoice));
    const amount = calculateDocumentTotal(invoice, company);
    if (isWithinDateRange(createdAt, params.dateFrom, params.dateTo)) {
      totalInvoices += amount;
      currency = toCurrency(invoice.currency);
      entries.push({
        date: createdAt,
        ref: invoice.invoiceNumber ?? invoice.invoice_number ?? 'Invoice',
        type: 'Invoice',
        amount,
        currency: toCurrency(invoice.currency),
        sortAt: createdAt,
      });
    }
  });

  params.payments
    .filter(payment => scopedInvoiceIds.has(paymentInvoiceId(payment)))
    .forEach(payment => {
      const date = paymentDate(payment);
      if (!isWithinDateRange(date, params.dateFrom, params.dateTo)) return;
      const invoice = scopedInvoices.find(item => item.id === paymentInvoiceId(payment));
      const amount = toNumber(payment.amount);
      totalPayments += amount;
      entries.push({
        date,
        ref: payment.reference || `Payment (${invoice?.invoiceNumber ?? invoice?.invoice_number ?? 'N/A'})`,
        type: 'Payment',
        amount: -amount,
        currency: toCurrency(invoice?.currency),
        sortAt: paymentCreatedAt(payment),
      });
    });

  scopedCreditNotes
    .filter(creditNote => countsAsStatementCredit(creditNote, scopedCreditNotes))
    .forEach(creditNote => {
      const createdAt = creditCreatedAt(creditNote);
      if (!isWithinDateRange(createdAt, params.dateFrom, params.dateTo)) return;
      const company = params.getCompany(creditCompanyId(creditNote));
      const amount = calculateDocumentTotal(creditNote, company);
      totalCredits += amount;
      entries.push({
        date: createdAt,
        ref: creditNumber(creditNote) || 'Credit Note',
        type: 'Credit Note',
        amount: -amount,
        currency: toCurrency(creditNote.currency),
        sortAt: createdAt,
      });
    });

  entries.sort((a, b) => {
    const timeDiff = new Date(a.sortAt).getTime() - new Date(b.sortAt).getTime();
    if (timeDiff !== 0) return timeDiff;
    const rank: Record<StatementEntryType, number> = { Invoice: 1, 'Credit Note': 2, Payment: 3 };
    return rank[a.type] - rank[b.type];
  });

  const runningBalances: number[] = [];
  const balance = entries.reduce((sum, entry) => {
    const next = sum + entry.amount;
    runningBalances.push(next);
    return next;
  }, 0);

  return {
    entries,
    runningBalances,
    totalInvoices,
    totalPayments,
    totalCredits,
    balance,
    invoiceCount: scopedInvoices.length,
    currency,
  };
}
