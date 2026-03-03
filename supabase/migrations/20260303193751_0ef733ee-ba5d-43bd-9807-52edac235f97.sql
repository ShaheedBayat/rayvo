
-- Add pricing_mode column to companies table
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS pricing_mode text NOT NULL DEFAULT 'exclusive';

-- Create tax_rates table
CREATE TABLE public.tax_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  name text NOT NULL,
  rate numeric NOT NULL DEFAULT 15,
  type text NOT NULL DEFAULT 'standard',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tax_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tax rates" ON public.tax_rates FOR SELECT USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can create tax rates" ON public.tax_rates FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update own tax rates" ON public.tax_rates FOR UPDATE USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can delete own tax rates" ON public.tax_rates FOR DELETE USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Create vat_ledger_entries table
CREATE TABLE public.vat_ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  invoice_number text NOT NULL,
  invoice_date date NOT NULL,
  customer_name text NOT NULL,
  tax_rate_name text NOT NULL DEFAULT 'Standard',
  tax_rate numeric NOT NULL DEFAULT 15,
  taxable_amount numeric NOT NULL DEFAULT 0,
  vat_amount numeric NOT NULL DEFAULT 0,
  entry_type text NOT NULL DEFAULT 'output_vat',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vat_ledger_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own vat entries" ON public.vat_ledger_entries FOR SELECT USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can create vat entries" ON public.vat_ledger_entries FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update own vat entries" ON public.vat_ledger_entries FOR UPDATE USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at on tax_rates
CREATE TRIGGER update_tax_rates_updated_at BEFORE UPDATE ON public.tax_rates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
