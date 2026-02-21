import { Link } from 'react-router-dom';
import { useInvoices, useCompanies } from '@/hooks/useInvoiceStore';
import { formatCurrency, calculateTotal } from '@/types/invoice';
import { FileText, Plus, MoreHorizontal, Trash2, Eye, Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import AppLayout from '@/components/AppLayout';

const statusStyles: Record<string, string> = {
  draft: 'bg-secondary text-secondary-foreground',
  sent: 'bg-accent text-accent-foreground',
  paid: 'bg-success text-success-foreground',
};

export default function Dashboard() {
  const { invoices, deleteInvoice } = useInvoices();
  const { getCompany } = useCompanies();

  return (
    <AppLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Invoices</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {invoices.length} invoice{invoices.length !== 1 ? 's' : ''} total
          </p>
        </div>
      </div>

      {invoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20">
          <FileText className="h-10 w-10 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">No invoices yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first invoice to get started.
          </p>
          <Link
            to="/invoices/new"
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Invoice
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border bg-card invoice-shadow">
          <div className="grid grid-cols-[1fr_1fr_1fr_auto_auto_auto] gap-4 border-b px-6 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <span>Invoice</span>
            <span>Client</span>
            <span>Company</span>
            <span>Amount</span>
            <span>Status</span>
            <span />
          </div>
          {invoices.map(inv => {
            const company = getCompany(inv.companyId);
            return (
              <div
                key={inv.id}
                className="grid grid-cols-[1fr_1fr_1fr_auto_auto_auto] items-center gap-4 border-b px-6 py-4 last:border-0 hover:bg-secondary/40 transition-colors"
              >
                <div>
                  <Link
                    to={`/invoices/${inv.id}`}
                    className="font-medium text-foreground hover:text-primary mono text-sm"
                  >
                    {inv.invoiceNumber}
                  </Link>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(inv.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-sm">{inv.clientName}</span>
                <div className="flex items-center gap-2 text-sm">
                  {company?.logo && (
                    <img src={company.logo} alt="" className="h-5 w-5 rounded object-contain" />
                  )}
                  <span className="text-muted-foreground">{company?.name || '—'}</span>
                </div>
                <span className="mono text-sm font-medium min-w-[100px] text-right">
                  {formatCurrency(calculateTotal(inv.items, inv.taxRate), inv.currency)}
                </span>
                <Badge className={`${statusStyles[inv.status]} capitalize min-w-[60px] justify-center`}>
                  {inv.status}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to={`/invoices/${inv.id}`}>
                        <Eye className="mr-2 h-4 w-4" /> View
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => deleteInvoice(inv.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
