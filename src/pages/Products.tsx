import { Package, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AppLayout from '@/components/AppLayout';

export default function Products() {
  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Products & Services</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a catalogue of items to add to your invoices quickly.
          </p>
        </div>
        <Button className="gap-1.5" disabled>
          <Plus className="h-4 w-4" />
          New Item
        </Button>
      </div>

      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20">
        <Package className="h-10 w-10 text-muted-foreground/40" />
        <h3 className="mt-4 text-lg font-medium">No products or services yet</h3>
        <p className="mt-1 text-sm text-muted-foreground max-w-sm text-center">
          Add your products and services here so you can quickly add them to invoices. Include item codes, prices, and tax rates.
        </p>
      </div>
    </AppLayout>
  );
}
