
-- Create a table to track per-company invoice counters
CREATE TABLE public.company_invoice_counters (
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  last_number INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (company_id)
);

-- Enable RLS
ALTER TABLE public.company_invoice_counters ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own counters"
  ON public.company_invoice_counters FOR SELECT
  USING (company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid()));

CREATE POLICY "Users can insert own counters"
  ON public.company_invoice_counters FOR INSERT
  WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid()));

CREATE POLICY "Users can update own counters"
  ON public.company_invoice_counters FOR UPDATE
  USING (company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid()));

-- Replace the invoice number trigger to use per-company numbering
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_next INTEGER;
BEGIN
  -- If no company_id, fall back to global sequence
  IF NEW.company_id IS NULL THEN
    NEW.invoice_number := 'INV-' || LPAD(nextval('public.invoice_number_seq')::text, 5, '0');
    RETURN NEW;
  END IF;

  -- Upsert the counter for this company
  INSERT INTO public.company_invoice_counters (company_id, last_number)
  VALUES (NEW.company_id, 1)
  ON CONFLICT (company_id) DO UPDATE SET last_number = company_invoice_counters.last_number + 1
  RETURNING last_number INTO v_next;

  NEW.invoice_number := 'INV-' || LPAD(v_next::text, 5, '0');
  RETURN NEW;
END;
$function$;
