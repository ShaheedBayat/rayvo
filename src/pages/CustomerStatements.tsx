import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCustomers } from '@/hooks/useCustomers';
import { useInvoices } from '@/hooks/useInvoiceStore';
import { useCreditNotes } from '@/hooks/useCreditNotes';
import { formatCurrency, calculateTotal, calculateSmartTotals } from '@/types/invoice';
import { useCompanies } from '@/hooks/useInvoiceStore';
import type { Currency } from '@/types/invoice';
import AppLayout from '@/components/AppLayout';
import { FileText } from 'lucide-react';

export default function CustomerStatements() {
  const { customers } = useCustomers();
  const { invoices } = useInvoices();
  const { getCompany } = useCompanies();
  const { creditNotes } = useCreditNotes();

  const customerBalances = useMemo(() => {
    return customers.map(c => {
      const custInvoices = invoices.filter(i => i.clientName === c.name && i.status !== 'voided' && i.status !== 'draft');
      const custCreditNotes = creditNotes.filter(cn => cn.clientName === c.name);

      const invoiceTotal = custInvoices.reduce((sum, i) => {
        const co = getCompany(i.companyId);
        return sum + calculateSmartTotals(i.items, i.taxRate, co?.pricingMode || 'exclusive', co?.isVatRegistered ?? false).total;
      }, 0);
      const creditTotal = custCreditNotes.reduce((sum, cn) => sum + calculateTotal(cn.items, cn.taxRate), 0);
      const balance = invoiceTotal - creditTotal;
      const currency = (custInvoices[0]?.currency || 'ZAR') as Currency;
      const invoiceCount = custInvoices.length;

      return { ...c, balance, currency, invoiceCount };
    }).filter(c => c.invoiceCount > 0);
  }, [customers, invoices, creditNotes]);

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Customer Statements</h1>
        <p className="mt-1 text-sm text-muted-foreground">View transaction history and balances for each customer.</p>
      </div>

      {customerBalances.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">No customer statements available yet.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Statements appear once customers have invoices.</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card invoice-shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="py-3 px-4 text-left font-medium text-muted-foreground">Customer</th>
                <th className="py-3 px-4 text-left font-medium text-muted-foreground">Email</th>
                <th className="py-3 px-4 text-right font-medium text-muted-foreground">Invoices</th>
                <th className="py-3 px-4 text-right font-medium text-muted-foreground">Balance</th>
                <th className="py-3 px-4 text-right font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {customerBalances.map(c => (
                <tr key={c.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="py-3 px-4 font-medium">{c.name}</td>
                  <td className="py-3 px-4 text-muted-foreground">{c.email || '—'}</td>
                  <td className="py-3 px-4 text-right mono">{c.invoiceCount}</td>
                  <td className={`py-3 px-4 text-right mono font-semibold ${c.balance > 0 ? 'text-foreground' : 'text-success'}`}>
                    {formatCurrency(c.balance, c.currency)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      to={`/customers/${c.id}/statement`}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      View Statement
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  );
}
