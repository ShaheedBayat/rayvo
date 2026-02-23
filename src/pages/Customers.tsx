import { Users, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AppLayout from '@/components/AppLayout';

export default function Customers() {
  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Customers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your customers and track outstanding payments.
          </p>
        </div>
        <Button className="gap-1.5" disabled>
          <Plus className="h-4 w-4" />
          New Customer
        </Button>
      </div>

      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20">
        <Users className="h-10 w-10 text-muted-foreground/40" />
        <h3 className="mt-4 text-lg font-medium">No customers yet</h3>
        <p className="mt-1 text-sm text-muted-foreground max-w-sm text-center">
          Customers will appear here once you create your first invoice. You'll be able to view contact details, invoice history, and outstanding balances.
        </p>
      </div>
    </AppLayout>
  );
}
