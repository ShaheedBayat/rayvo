
ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS is_billable boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_billed boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS billed_invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL DEFAULT NULL;
