import { useState } from 'react';
import { useExpenses, type Expense } from '@/hooks/useExpenses';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { formatCurrency } from '@/types/invoice';
import type { Currency, InvoiceItem } from '@/types/invoice';
import { Receipt, Plus } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface BillableExpensesProps {
  clientName: string;
  customerId: string | null;
  currency: Currency;
  onAddItems: (items: InvoiceItem[], expenseIds: string[]) => void;
}

export default function BillableExpenses({ clientName, customerId, currency, onAddItems }: BillableExpensesProps) {
  const { expenses } = useExpenses();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Get unbilled billable expenses for this customer
  const unbilledExpenses = expenses.filter(e =>
    e.isBillable && !e.isBilled && e.customerId === customerId
  );

  if (!customerId || unbilledExpenses.length === 0) return null;

  const toggleExpense = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === unbilledExpenses.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(unbilledExpenses.map(e => e.id)));
    }
  };

  const handleAddToInvoice = () => {
    const selected = unbilledExpenses.filter(e => selectedIds.has(e.id));
    const newItems: InvoiceItem[] = selected.map(e => ({
      id: uuidv4(),
      description: `${e.description}${e.vendor ? ` (${e.vendor})` : ''}${e.reference ? ` — Ref: ${e.reference}` : ''}`,
      quantity: 1,
      unitPrice: e.amount,
    }));
    onAddItems(newItems, selected.map(e => e.id));
    setSelectedIds(new Set());
  };

  const selectedTotal = unbilledExpenses
    .filter(e => selectedIds.has(e.id))
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-5 invoice-shadow">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium uppercase tracking-wider text-primary flex items-center gap-2">
          <Receipt className="h-4 w-4" /> Billable Expenses
        </h2>
        <span className="text-xs text-muted-foreground">{unbilledExpenses.length} unbilled</span>
      </div>

      <div className="space-y-1">
        <label className="flex items-center gap-2 text-xs text-muted-foreground mb-2 cursor-pointer">
          <Checkbox
            checked={selectedIds.size === unbilledExpenses.length && unbilledExpenses.length > 0}
            onCheckedChange={toggleAll}
          />
          Select all
        </label>
        {unbilledExpenses.map(e => (
          <label
            key={e.id}
            className="flex items-center gap-3 rounded-md border border-border/50 bg-card p-2.5 cursor-pointer hover:bg-muted/30 transition-colors"
          >
            <Checkbox
              checked={selectedIds.has(e.id)}
              onCheckedChange={() => toggleExpense(e.id)}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{e.description}</p>
              <p className="text-xs text-muted-foreground">
                {e.category}{e.vendor ? ` · ${e.vendor}` : ''} · {e.date}
              </p>
            </div>
            <span className="text-sm mono font-medium whitespace-nowrap">
              {formatCurrency(e.amount, currency)}
            </span>
          </label>
        ))}
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-primary/20">
          <span className="text-xs text-muted-foreground">
            {selectedIds.size} selected · {formatCurrency(selectedTotal, currency)}
          </span>
          <Button size="sm" onClick={handleAddToInvoice} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add to Invoice
          </Button>
        </div>
      )}
    </div>
  );
}
