
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS invoice_type text NOT NULL DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS deposit_type text DEFAULT 'percentage',
ADD COLUMN IF NOT EXISTS deposit_value numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS parent_invoice_id uuid REFERENCES public.invoices(id) DEFAULT NULL;
