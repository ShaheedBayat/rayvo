import { Receipt, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AppLayout from '@/components/AppLayout';

export default function CreditNotes() {
  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Credit Notes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Issue credit notes against invoices.
          </p>
        </div>
        <Button className="gap-1.5 rounded-lg" disabled>
          <Plus className="h-4 w-4" />
          New Credit Note
        </Button>
      </div>

      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-20">
        <Receipt className="h-10 w-10 text-muted-foreground/30" />
        <h3 className="mt-4 text-lg font-medium">No credit notes yet</h3>
        <p className="mt-1 text-sm text-muted-foreground max-w-sm text-center">
          Create credit notes to issue refunds or adjustments against existing invoices.
        </p>
      </div>
    </AppLayout>
  );
}
