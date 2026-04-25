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
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS NOT NULL AND NEW.status <> 'draft' THEN
      v_should_assign := true;
    ELSE
      IF NEW.invoice_number IS NULL
         OR NEW.invoice_number = ''
         OR NEW.invoice_number = 'TEMP'
         OR NEW.invoice_number LIKE 'INV-%' THEN
        NEW.invoice_number := 'DRAFT-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
      END IF;
      RETURN NEW;
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.invoice_number LIKE 'INV-%'
       AND (NEW.invoice_number IS NULL OR NEW.invoice_number = '' OR NEW.invoice_number = 'TEMP' OR NEW.invoice_number LIKE 'DRAFT-%') THEN
      NEW.invoice_number := OLD.invoice_number;
      RETURN NEW;
    END IF;

    IF NEW.status IS DISTINCT FROM 'draft'
       AND (NEW.invoice_number IS NULL OR NEW.invoice_number = '' OR NEW.invoice_number = 'TEMP' OR NEW.invoice_number LIKE 'DRAFT-%') THEN
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
    VALUES (NEW.company_id, COALESCE((
      SELECT MAX((regexp_match(invoice_number, '^INV-([0-9]+)$'))[1]::integer)
      FROM public.invoices
      WHERE company_id = NEW.company_id
        AND invoice_number ~ '^INV-[0-9]+$'
    ), 0) + 1)
    ON CONFLICT (company_id) DO UPDATE
      SET last_number = GREATEST(
        public.company_invoice_counters.last_number,
        COALESCE((
          SELECT MAX((regexp_match(invoice_number, '^INV-([0-9]+)$'))[1]::integer)
          FROM public.invoices
          WHERE company_id = NEW.company_id
            AND invoice_number ~ '^INV-[0-9]+$'
        ), 0)
      ) + 1
    RETURNING last_number INTO v_next;

    NEW.invoice_number := 'INV-' || LPAD(v_next::text, 5, '0');
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS set_invoice_number ON public.invoices;
DROP TRIGGER IF EXISTS generate_invoice_number_trigger ON public.invoices;
DROP TRIGGER IF EXISTS trg_generate_invoice_number ON public.invoices;
DROP TRIGGER IF EXISTS invoices_generate_number ON public.invoices;
DROP TRIGGER IF EXISTS invoices_generate_number_update ON public.invoices;

CREATE TRIGGER invoices_generate_number
BEFORE INSERT OR UPDATE OF status, invoice_number, company_id ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.generate_invoice_number();