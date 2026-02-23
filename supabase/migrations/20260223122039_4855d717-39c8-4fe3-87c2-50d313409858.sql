
-- Global settings table for banking details and terms & conditions
CREATE TABLE public.global_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL,
  banking_details text DEFAULT '',
  terms_conditions text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- One row per user
CREATE UNIQUE INDEX idx_global_settings_owner ON public.global_settings(owner_id);

ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings" ON public.global_settings FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Users can insert own settings" ON public.global_settings FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update own settings" ON public.global_settings FOR UPDATE USING (owner_id = auth.uid());

CREATE TRIGGER update_global_settings_updated_at BEFORE UPDATE ON public.global_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Recurring invoices table
CREATE TABLE public.recurring_invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL,
  company_id uuid REFERENCES public.companies(id),
  client_name text NOT NULL,
  client_email text DEFAULT '',
  client_address text DEFAULT '',
  currency text NOT NULL DEFAULT 'ZAR',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  tax_rate numeric NOT NULL DEFAULT 15,
  notes text DEFAULT '',
  frequency text NOT NULL DEFAULT 'monthly', -- monthly, weekly, yearly
  day_of_month int DEFAULT 1,
  next_run_date date NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.recurring_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recurring" ON public.recurring_invoices FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Users can create recurring" ON public.recurring_invoices FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update own recurring" ON public.recurring_invoices FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users can delete own recurring" ON public.recurring_invoices FOR DELETE USING (owner_id = auth.uid());

CREATE TRIGGER update_recurring_invoices_updated_at BEFORE UPDATE ON public.recurring_invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
