import { describe, expect, it } from 'vitest';
import { buildCustomerStatement, calculateInvoiceCredits } from './customerStatement';

const company = { id: 'company-a', pricingMode: 'inclusive' as const, isVatRegistered: true };
const getCompany = () => company;
const inv = (id: string, n: string, clientName: string, companyId: string, total: number, createdAt: string) => ({
  id,
  invoiceNumber: n,
  clientName,
  companyId,
  status: 'sent',
  currency: 'ZAR',
  taxRate: 15,
  createdAt,
  items: [{ id: `${id}-item`, description: n, quantity: 1, unitPrice: total, taxRate: 15 }],
});
const payment = (invoiceId: string, amount: number, createdAt: string) => ({ invoiceId, amount, paymentDate: createdAt.slice(0, 10), createdAt, reference: '' });
const credit = (number: string, invoiceId: string | null, amount: number, status: string, notes: string, createdAt: string) => ({
  creditNoteNumber: number,
  invoiceId,
  clientName: 'Shaheed Bayat',
  companyId: 'company-a',
  status,
  notes,
  currency: 'ZAR',
  taxRate: 0,
  createdAt,
  items: [{ id: `${number}-item`, description: number, quantity: 1, unitPrice: amount }],
});

describe('customer statement calculations', () => {
  it('uses invoice total minus payments minus overpayment credits exactly once', () => {
    const invoices = [
      inv('i15', 'INV-00015', 'Shaheed Bayat', 'company-a', 10000, '2026-04-25T10:00:00Z'),
      inv('i16', 'INV-00016', 'Shaheed Bayat', 'company-a', 20000, '2026-04-25T11:00:00Z'),
      inv('i17', 'INV-00017', 'Shaheed Bayat', 'company-a', 5000, '2026-04-25T12:00:00Z'),
    ];
    const payments = [payment('i15', 10000, '2026-04-25T10:05:00Z'), payment('i16', 10000, '2026-04-25T11:05:00Z'), payment('i17', 10000, '2026-04-25T12:05:00Z')];
    const creditNotes = [credit('CN-1', 'i17', 5000, 'available', 'Auto-generated from overpayment on invoice INV-00017', '2026-04-25T12:06:00Z')];

    const statement = buildCustomerStatement({ customerName: 'Shaheed Bayat', companyId: 'company-a', invoices, payments, creditNotes, getCompany });

    expect(statement.totalInvoices).toBe(35000);
    expect(statement.totalPayments).toBe(30000);
    expect(statement.totalCredits).toBe(5000);
    expect(statement.balance).toBe(0);
  });

  it('isolates same-name customers by company', () => {
    const invoices = [inv('a1', 'INV-A', 'Shaheed Bayat', 'company-a', 1000, '2026-04-25T10:00:00Z'), inv('b1', 'INV-B', 'Shaheed Bayat', 'company-b', 9000, '2026-04-25T10:00:00Z')];
    const statement = buildCustomerStatement({ customerName: ' shaheed   bayat ', companyId: 'company-a', invoices, payments: [], creditNotes: [], getCompany });

    expect(statement.invoiceCount).toBe(1);
    expect(statement.balance).toBe(1000);
  });

  it('counts applied credits on invoice balances but excludes source overpayment double-counting', () => {
    const notes = [
      credit('CN-1', 'i1', 850, 'applied', 'Auto-generated from overpayment on invoice INV-1', '2026-04-25T10:00:00Z'),
      credit('CN-2', 'i2', 850, 'approved', 'Applied from credit note CN-1', '2026-04-25T10:05:00Z'),
    ];

    expect(calculateInvoiceCredits(notes.filter(c => c.invoiceId === 'i1'), company)).toBe(0);
    expect(calculateInvoiceCredits(notes.filter(c => c.invoiceId === 'i2'), company)).toBe(850);
  });
});
