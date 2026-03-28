
CREATE OR REPLACE FUNCTION public.generate_quote_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_next INTEGER;
BEGIN
  IF NEW.company_id IS NULL THEN
    NEW.quote_number := 'QUO-00001';
    RETURN NEW;
  END IF;
  INSERT INTO public.company_quote_counters (company_id, last_number)
  VALUES (NEW.company_id, 1)
  ON CONFLICT (company_id) DO UPDATE SET last_number = company_quote_counters.last_number + 1
  RETURNING last_number INTO v_next;
  NEW.quote_number := 'QUO-' || LPAD(v_next::text, 5, '0');
  RETURN NEW;
END;
$function$;
