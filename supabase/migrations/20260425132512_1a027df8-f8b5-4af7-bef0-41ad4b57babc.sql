-- Harden the invoice_number trigger:
-- 1. On UPDATE, if NEW.invoice_number is being set to a DRAFT-* value but OLD.invoice_number is already INV-*, keep the OLD value.
-- 2. Also: if status is non-draft and current value is still DRAFT-*, assign a real INV- number (covers any path that missed it).

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS trigger
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
    IF NEW.status IS NOT NULL AND NEW.status <> 'draft' THEN
      v_should_assign := true;
    ELSE
      IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' OR NEW.invoice_number LIKE 'INV-%' THEN
        NEW.invoice_number := 'DRAFT-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
      END IF;
      RETURN NEW;
    END IF;
  END IF;

  -- UPDATE path
  IF TG_OP = 'UPDATE' THEN
    -- PROTECTION: Never let an already-finalized INV- number be overwritten with a DRAFT- value
    IF OLD.invoice_number LIKE 'INV-%'
       AND (NEW.invoice_number IS NULL OR NEW.invoice_number = '' OR NEW.invoice_number LIKE 'DRAFT-%') THEN
      NEW.invoice_number := OLD.invoice_number;
    END IF;

    -- Assign real INV- number when:
    --   (a) transitioning out of draft for the first time, OR
    --   (b) status is non-draft but number is still a DRAFT- placeholder (defensive)
    IF NEW.status IS DISTINCT FROM 'draft'
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

-- Backfill: fix the existing affected invoice (DRAFT-b9fe2d32, status sent) by assigning the next INV- number for its company
DO $$
DECLARE
  r RECORD;
  v_next INTEGER;
BEGIN
  FOR r IN
    SELECT id, company_id FROM public.invoices
    WHERE status <> 'draft' AND invoice_number LIKE 'DRAFT-%' AND deleted_at IS NULL
  LOOP
    INSERT INTO public.company_invoice_counters (company_id, last_number)
    VALUES (r.company_id, 1)
    ON CONFLICT (company_id) DO UPDATE SET last_number = company_invoice_counters.last_number + 1
    RETURNING last_number INTO v_next;

    UPDATE public.invoices
    SET invoice_number = 'INV-' || LPAD(v_next::text, 5, '0')
    WHERE id = r.id;
  END LOOP;
END $$;