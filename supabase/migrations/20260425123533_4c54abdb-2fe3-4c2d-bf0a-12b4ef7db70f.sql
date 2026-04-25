
-- 1. Add columns
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS converted_invoice_id UUID;

-- 2. Public read policy for shared quotes
DROP POLICY IF EXISTS "Public can view shared quotes" ON public.quotes;
CREATE POLICY "Public can view shared quotes"
ON public.quotes
FOR SELECT
TO public
USING (share_token IS NOT NULL);

-- 3. Allow public to view companies referenced by shared quotes (extend existing pattern)
DROP POLICY IF EXISTS companies_select_public_shared_quotes ON public.companies;
CREATE POLICY companies_select_public_shared_quotes
ON public.companies
FOR SELECT
TO anon
USING (id IN (SELECT company_id FROM public.quotes WHERE share_token IS NOT NULL));

-- 4. Secure RPC for customer response (accept/reject by token)
CREATE OR REPLACE FUNCTION public.respond_to_quote(
  _quote_id UUID,
  _token TEXT,
  _action TEXT,
  _reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q RECORD;
  new_invoice_id UUID;
  next_num INT;
  inv_number TEXT;
BEGIN
  SELECT * INTO q FROM public.quotes
  WHERE id = _quote_id AND share_token = _token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Quote not found or invalid token');
  END IF;

  IF q.status IN ('accepted','rejected','converted') THEN
    RETURN jsonb_build_object('error', 'Quote already responded to', 'status', q.status);
  END IF;

  IF _action = 'accept' THEN
    new_invoice_id := gen_random_uuid();

    -- Get next invoice number for the company
    INSERT INTO public.company_invoice_counters (company_id, last_number)
    VALUES (q.company_id, 1)
    ON CONFLICT (company_id) DO UPDATE SET last_number = company_invoice_counters.last_number + 1
    RETURNING last_number INTO next_num;

    inv_number := 'INV-' || LPAD(next_num::text, 5, '0');

    INSERT INTO public.invoices (
      id, owner_id, company_id, invoice_number, client_name, client_email,
      client_address, items, tax_rate, currency, status, notes, due_date
    ) VALUES (
      new_invoice_id, q.owner_id, q.company_id, inv_number, q.client_name,
      q.client_email, q.client_address, q.items, q.tax_rate, q.currency,
      'draft', q.notes, (CURRENT_DATE + INTERVAL '30 days')::date
    );

    UPDATE public.quotes
    SET status = 'converted',
        responded_at = now(),
        converted_invoice_id = new_invoice_id,
        updated_at = now()
    WHERE id = _quote_id;

    RETURN jsonb_build_object('success', true, 'action', 'accepted', 'invoice_id', new_invoice_id, 'invoice_number', inv_number);

  ELSIF _action = 'reject' THEN
    UPDATE public.quotes
    SET status = 'rejected',
        rejection_reason = NULLIF(TRIM(COALESCE(_reason, '')), ''),
        responded_at = now(),
        updated_at = now()
    WHERE id = _quote_id;

    RETURN jsonb_build_object('success', true, 'action', 'rejected');
  ELSE
    RETURN jsonb_build_object('error', 'Invalid action');
  END IF;
END;
$$;

-- 5. Add unique constraint to company_invoice_counters if missing (needed for ON CONFLICT)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'company_invoice_counters_pkey'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.company_invoice_counters'::regclass
      AND contype IN ('p','u')
  ) THEN
    ALTER TABLE public.company_invoice_counters ADD PRIMARY KEY (company_id);
  END IF;
END$$;

-- 6. Allow public/anon to call the RPC
GRANT EXECUTE ON FUNCTION public.respond_to_quote(UUID, TEXT, TEXT, TEXT) TO anon, authenticated;
