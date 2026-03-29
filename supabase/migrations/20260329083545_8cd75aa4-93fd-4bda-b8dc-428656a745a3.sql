CREATE OR REPLACE FUNCTION public.has_company_access(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    public.is_super_admin(_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.companies
      WHERE id = _company_id
        AND owner_id = _user_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.company_users
      WHERE user_id = _user_id
        AND company_id = _company_id
    );
$function$;