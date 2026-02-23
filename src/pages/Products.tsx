import { Package, Plus, Upload, Download, Filter } from 'lucide-react';
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
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 rounded-lg hidden sm:flex">
            <Upload className="h-3.5 w-3.5" /> Import
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 rounded-lg hidden sm:flex">
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          <Button className="gap-1.5 rounded-lg" disabled>
            <Plus className="h-4 w-4" />
            New Item
          </Button>
        </div>
      </div>

      {/* Column headers placeholder */}
      <div className="rounded-xl border border-border/50 bg-card invoice-shadow overflow-hidden mb-4">
        <div className="border-b bg-muted/20 px-4 py-3 flex items-center gap-6">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground w-20">Code</span>
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex-1">Name</span>
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground w-24 hidden sm:block">Type</span>
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground w-24 hidden md:block text-right">Cost</span>
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground w-24 text-right">Sale Price</span>
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground w-20 hidden md:block text-right">Tax</span>
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground w-20 text-center">Status</span>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-20">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/5 mb-4">
          <Package className="h-8 w-8 text-primary/40" />
        </div>
        <h3 className="text-lg font-medium">No products or services yet</h3>
        <p className="mt-1 text-sm text-muted-foreground max-w-sm text-center">
          Add your products and services here so you can quickly add them to invoices. Include item codes, prices, and tax rates.
        </p>
        <Button className="mt-6 gap-1.5 rounded-lg" disabled>
          <Plus className="h-4 w-4" />
          Add your first item
        </Button>
      </div>
    </AppLayout>
  );
}
