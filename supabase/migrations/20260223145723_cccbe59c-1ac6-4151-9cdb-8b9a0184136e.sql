
-- =============================================
-- PHASE 2: Credit Notes, Quotes, Customer company scoping
-- =============================================

-- 1. Credit Notes table
CREATE TABLE public.credit_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  company_id UUID REFERENCES public.companies(id),
  credit_note_number TEXT NOT NULL DEFAULT '',
  invoice_id UUID REFERENCES public.invoices(id),
  client_name TEXT NOT NULL,
  client_email TEXT DEFAULT '',
  client_address TEXT DEFAULT '',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  tax_rate NUMERIC NOT NULL DEFAULT 15,
  currency TEXT NOT NULL DEFAULT 'ZAR',
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  due_date DATE NOT NULL DEFAULT (CURRENT_DATE + '30 days'::interval),
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credit notes" ON public.credit_notes FOR SELECT USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can create credit notes" ON public.credit_notes FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update own credit notes" ON public.credit_notes FOR UPDATE USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can delete own credit notes" ON public.credit_notes FOR DELETE USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Credit note counter per company
CREATE TABLE public.company_credit_note_counters (
  company_id UUID PRIMARY KEY REFERENCES public.companies(id),
  last_number INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.company_credit_note_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cn counters" ON public.company_credit_note_counters FOR SELECT USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));
CREATE POLICY "Users can insert own cn counters" ON public.company_credit_note_counters FOR INSERT WITH CHECK (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));
CREATE POLICY "Users can update own cn counters" ON public.company_credit_note_counters FOR UPDATE USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));

-- Credit note number trigger
CREATE OR REPLACE FUNCTION public.generate_credit_note_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_next INTEGER;
BEGIN
  IF NEW.company_id IS NULL THEN
    NEW.credit_note_number := 'CN-00001';
    RETURN NEW;
  END IF;
  INSERT INTO public.company_credit_note_counters (company_id, last_number)
  VALUES (NEW.company_id, 1)
  ON CONFLICT (company_id) DO UPDATE SET last_number = company_credit_note_counters.last_number + 1
  RETURNING last_number INTO v_next;
  NEW.credit_note_number := 'CN-' || LPAD(v_next::text, 5, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_credit_note_number
BEFORE INSERT ON public.credit_notes
FOR EACH ROW EXECUTE FUNCTION public.generate_credit_note_number();

-- updated_at trigger for credit_notes
CREATE TRIGGER update_credit_notes_updated_at
BEFORE UPDATE ON public.credit_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Quotes table
CREATE TABLE public.quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  company_id UUID REFERENCES public.companies(id),
  quote_number TEXT NOT NULL DEFAULT '',
  client_name TEXT NOT NULL,
  client_email TEXT DEFAULT '',
  client_address TEXT DEFAULT '',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  tax_rate NUMERIC NOT NULL DEFAULT 15,
  currency TEXT NOT NULL DEFAULT 'ZAR',
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT DEFAULT '',
  valid_until DATE NOT NULL DEFAULT (CURRENT_DATE + '30 days'::interval),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quotes" ON public.quotes FOR SELECT USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can create quotes" ON public.quotes FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update own quotes" ON public.quotes FOR UPDATE USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can delete own quotes" ON public.quotes FOR DELETE USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Quote counter per company
CREATE TABLE public.company_quote_counters (
  company_id UUID PRIMARY KEY REFERENCES public.companies(id),
  last_number INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.company_quote_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quote counters" ON public.company_quote_counters FOR SELECT USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));
CREATE POLICY "Users can insert own quote counters" ON public.company_quote_counters FOR INSERT WITH CHECK (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));
CREATE POLICY "Users can update own quote counters" ON public.company_quote_counters FOR UPDATE USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));

-- Quote number trigger
CREATE OR REPLACE FUNCTION public.generate_quote_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_next INTEGER;
BEGIN
  IF NEW.company_id IS NULL THEN
    NEW.quote_number := 'QU-00001';
    RETURN NEW;
  END IF;
  INSERT INTO public.company_quote_counters (company_id, last_number)
  VALUES (NEW.company_id, 1)
  ON CONFLICT (company_id) DO UPDATE SET last_number = company_quote_counters.last_number + 1
  RETURNING last_number INTO v_next;
  NEW.quote_number := 'QU-' || LPAD(v_next::text, 5, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_quote_number
BEFORE INSERT ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.generate_quote_number();

CREATE TRIGGER update_quotes_updated_at
BEFORE UPDATE ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Add company_id to customers table
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
