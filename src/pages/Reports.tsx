import { BarChart3 } from 'lucide-react';
import AppLayout from '@/components/AppLayout';

export default function Reports() {
  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View summaries of your invoicing activity.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20">
        <BarChart3 className="h-10 w-10 text-muted-foreground/40" />
        <h3 className="mt-4 text-lg font-medium">Reports coming soon</h3>
        <p className="mt-1 text-sm text-muted-foreground max-w-sm text-center">
          You'll be able to view accounts receivable summaries, invoice aging, sales by customer, and paid vs unpaid totals.
        </p>
      </div>
    </AppLayout>
  );
}
