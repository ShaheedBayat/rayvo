-- Update invoice number trigger: assign final number only on finalization (not on draft)
-- Drafts get a temporary placeholder like "DRAFT-<short uuid>"

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_next INTEGER;
  v_should_assign BOOLEAN := false;
BEGIN
  -- INSERT path
  IF TG_OP = 'INSERT' THEN
    -- If creating as a non-draft (sent/approved/etc.), assign final number now
    IF NEW.status IS NOT NULL AND NEW.status <> 'draft' THEN
      v_should_assign := true;
    ELSE
      -- Draft: assign a temporary placeholder so column stays unique & non-null
      IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' OR NEW.invoice_number LIKE 'INV-%' THEN
        NEW.invoice_number := 'DRAFT-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
      END IF;
      RETURN NEW;
    END IF;
  END IF;

  -- UPDATE path: assign a real number when transitioning out of draft for the first time
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'draft'
       AND NEW.status IS DISTINCT FROM 'draft'
       AND (NEW.invoice_number IS NULL OR NEW.invoice_number = '' OR NEW.invoice_number LIKE 'DRAFT-%') THEN
      v_should_assign := true;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  IF v_should_assign THEN
    IF NEW.company_id IS NULL THEN
      NEW.invoice_number := 'INV-' || LPAD(nextval('public.invoice_number_seq')::text, 5, '0');
      RETURN NEW;
    END IF;

    INSERT INTO public.company_invoice_counters (company_id, last_number)
    VALUES (NEW.company_id, 1)
    ON CONFLICT (company_id) DO UPDATE SET last_number = company_invoice_counters.last_number + 1
    RETURNING last_number INTO v_next;

    NEW.invoice_number := 'INV-' || LPAD(v_next::text, 5, '0');
  END IF;

  RETURN NEW;
END;
$function$;

-- Recreate triggers (drop any existing, then add INSERT + UPDATE)
DROP TRIGGER IF EXISTS set_invoice_number ON public.invoices;
DROP TRIGGER IF EXISTS generate_invoice_number_trigger ON public.invoices;
DROP TRIGGER IF EXISTS invoices_generate_number ON public.invoices;
DROP TRIGGER IF EXISTS invoices_generate_number_update ON public.invoices;

CREATE TRIGGER invoices_generate_number
BEFORE INSERT ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.generate_invoice_number();

CREATE TRIGGER invoices_generate_number_update
BEFORE UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.generate_invoice_number();

-- Also update the quote acceptance RPC so the auto-generated invoice from quote
-- conversion uses the trigger (don't pre-compute number) and is created as draft.
CREATE OR REPLACE FUNCTION public.respond_to_quote(_quote_id uuid, _token text, _action text, _reason text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  q RECORD;
  new_invoice_id UUID;
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

    -- Insert as draft; the BEFORE INSERT trigger will assign a DRAFT- placeholder.
    -- The real INV- number is assigned later when the user marks it sent/approved.
    INSERT INTO public.invoices (
      id, owner_id, company_id, client_name, client_email,
      client_address, items, tax_rate, currency, status, notes, due_date
    ) VALUES (
      new_invoice_id, q.owner_id, q.company_id, q.client_name,
      q.client_email, q.client_address, q.items, q.tax_rate, q.currency,
      'draft', q.notes, (CURRENT_DATE + INTERVAL '30 days')::date
    );

    UPDATE public.quotes
    SET status = 'converted',
        responded_at = now(),
        converted_invoice_id = new_invoice_id,
        updated_at = now()
    WHERE id = _quote_id;

    RETURN jsonb_build_object('success', true, 'action', 'accepted', 'invoice_id', new_invoice_id);

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
$function$;