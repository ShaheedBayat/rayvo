import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useInvoices, useCompanies } from '@/hooks/useInvoiceStore';
import { formatCurrency, calculateTotal } from '@/types/invoice';
import { FileText, Plus, MoreHorizontal, Trash2, Eye, Copy, Send, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import AppLayout from '@/components/AppLayout';
import { toast } from 'sonner';

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  sent: { label: 'Awaiting Payment', className: 'bg-warning/10 text-warning border-warning/20' },
  paid: { label: 'Paid', className: 'bg-success/10 text-success border-success/20' },
};

export default function Invoices() {
  const { invoices, softDeleteInvoice, fetchDeletedInvoices } = useInvoices();
  const { getCompany } = useCompanies();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [deletedInvoices, setDeletedInvoices] = useState<any[]>([]);

  const handleShowDeleted = async () => {
    if (!showDeleted) {
      const deleted = await fetchDeletedInvoices();
      setDeletedInvoices(deleted);
    }
    setShowDeleted(!showDeleted);
    setStatusFilter(null);
  };

  const displayInvoices = showDeleted ? deletedInvoices : invoices;

  const filtered = displayInvoices.filter((inv) => {
    const matchesSearch =
      !search ||
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.clientName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statuses = ['draft', 'sent', 'paid'];

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Invoices</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {invoices.length} invoice{invoices.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <Link to="/invoices/new">
          <Button className="gap-1.5">
            <Plus className="h-4 w-4" />
            New Invoice
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search invoices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setStatusFilter(null)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              !statusFilter
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            All
          </button>
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? null : s)}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                statusFilter === s
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {statusConfig[s]?.label || s}
            </button>
          ))}
          <button
            onClick={handleShowDeleted}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              showDeleted
                ? 'bg-destructive text-destructive-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            Deleted
          </button>
        </div>
      </div>

      {invoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20">
          <FileText className="h-10 w-10 text-muted-foreground/40" />
          <h3 className="mt-4 text-lg font-medium">No invoices yet</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm text-center">
            Invoices let you bill your customers and track payments. Create your first one to get started.
          </p>
          <Link
            to="/invoices/new"
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create your first invoice
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border bg-card invoice-shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Invoice
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground hidden md:table-cell">
                    Company
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground hidden sm:table-cell">
                    Due Date
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => {
                  const company = getCompany(inv.companyId);
                  const config = statusConfig[inv.status] || statusConfig.draft;
                  return (
                    <tr
                      key={inv.id}
                      className="border-b last:border-0 hover:bg-secondary/40 transition-colors"
                    >
                      <td className="px-4 py-3.5">
                        <Link
                          to={`/invoices/${inv.id}`}
                          className="font-medium text-foreground hover:text-primary mono text-sm"
                        >
                          {inv.invoiceNumber}
                        </Link>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(inv.createdAt).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">{inv.clientName}</td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          {company?.logo && (
                            <img
                              src={company.logo}
                              alt=""
                              className="h-5 w-5 rounded object-contain"
                            />
                          )}
                          <span className="text-muted-foreground">
                            {company?.name || '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground hidden sm:table-cell">
                        {new Date(inv.dueDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="mono font-medium">
                          {formatCurrency(
                            calculateTotal(inv.items, inv.taxRate),
                            inv.currency
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <Badge
                          variant="outline"
                          className={`${config.className} text-[11px] capitalize`}
                        >
                          {config.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5">
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
                              onClick={async () => {
                                const result = await softDeleteInvoice(inv.id);
                                if (result.blocked) {
                                  toast.error(result.error);
                                } else if (result.error) {
                                  toast.error(result.error);
                                } else {
                                  toast.success('Invoice moved to deleted');
                                }
                              }}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
