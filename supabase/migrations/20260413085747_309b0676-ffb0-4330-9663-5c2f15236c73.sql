
-- Update check_super_admin_on_profile to only include shaheedbayat1
CREATE OR REPLACE FUNCTION public.check_super_admin_on_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_email text;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = NEW.user_id;
  IF v_email = 'shaheedbayat1@gmail.com' THEN
    NEW.is_super_admin := true;
  END IF;
  RETURN NEW;
END;
$function$;

-- Update is_superuser_email
CREATE OR REPLACE FUNCTION public.is_superuser_email()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
      AND email = 'shaheedbayat1@gmail.com'
  );
$function$;

-- Update has_company_access
CREATE OR REPLACE FUNCTION public.has_company_access(_user_id uuid, _company_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    EXISTS (SELECT 1 FROM auth.users WHERE id = _user_id AND email = 'shaheedbayat1@gmail.com')
    OR EXISTS (
      SELECT 1 FROM public.companies
      WHERE id = _company_id AND owner_id = _user_id
    )
    OR EXISTS (
      SELECT 1 FROM public.company_users
      WHERE user_id = _user_id AND company_id = _company_id
    );
$function$;

-- Remove super admin from mo@rayn.co.za
UPDATE public.profiles SET is_super_admin = false WHERE user_id = '9d1f3346-2258-44db-b000-af63ab467d67';
