
-- Add new columns to customers table
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS tax_id_number text DEFAULT '',
  ADD COLUMN IF NOT EXISTS website text DEFAULT '',
  ADD COLUMN IF NOT EXISTS notes text DEFAULT '',
  ADD COLUMN IF NOT EXISTS industry text DEFAULT '',
  ADD COLUMN IF NOT EXISTS billing_street text DEFAULT '',
  ADD COLUMN IF NOT EXISTS billing_suburb text DEFAULT '',
  ADD COLUMN IF NOT EXISTS billing_city text DEFAULT '',
  ADD COLUMN IF NOT EXISTS billing_province text DEFAULT '',
  ADD COLUMN IF NOT EXISTS billing_postal_code text DEFAULT '',
  ADD COLUMN IF NOT EXISTS billing_country text DEFAULT 'South Africa',
  ADD COLUMN IF NOT EXISTS delivery_street text DEFAULT '',
  ADD COLUMN IF NOT EXISTS delivery_suburb text DEFAULT '',
  ADD COLUMN IF NOT EXISTS delivery_city text DEFAULT '',
  ADD COLUMN IF NOT EXISTS delivery_province text DEFAULT '',
  ADD COLUMN IF NOT EXISTS delivery_postal_code text DEFAULT '',
  ADD COLUMN IF NOT EXISTS delivery_country text DEFAULT '',
  ADD COLUMN IF NOT EXISTS delivery_same_as_billing boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'ZAR',
  ADD COLUMN IF NOT EXISTS bank_account_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS bank_account_number text DEFAULT '',
  ADD COLUMN IF NOT EXISTS payment_reference text DEFAULT '',
  ADD COLUMN IF NOT EXISTS credit_limit numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS block_on_credit_limit boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_due_days integer DEFAULT 30,
  ADD COLUMN IF NOT EXISTS default_tax_rate numeric DEFAULT 15,
  ADD COLUMN IF NOT EXISTS default_discount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS default_line_amounts text DEFAULT 'tax_inclusive',
  ADD COLUMN IF NOT EXISTS sales_tax_override text DEFAULT '',
  ADD COLUMN IF NOT EXISTS tax_exempt boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS account_number text DEFAULT '',
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- Create customer_contacts table
CREATE TABLE IF NOT EXISTS public.customer_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  email text DEFAULT '',
  phone text DEFAULT '',
  role text DEFAULT '',
  is_primary boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.customer_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own customer contacts"
  ON public.customer_contacts FOR SELECT
  USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create customer contacts"
  ON public.customer_contacts FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own customer contacts"
  ON public.customer_contacts FOR UPDATE
  USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete own customer contacts"
  ON public.customer_contacts FOR DELETE
  USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Add unique index on account_number per owner
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_account_number 
  ON public.customers(owner_id, account_number) 
  WHERE account_number != '';
