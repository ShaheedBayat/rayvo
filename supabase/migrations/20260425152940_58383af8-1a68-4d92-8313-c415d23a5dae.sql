CREATE OR REPLACE FUNCTION public.unblock_user(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_is_super boolean;
  v_shares_company boolean;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Super admin?
  v_is_super := public.is_superuser_email();

  -- Company admin who shares a company with the target user?
  SELECT EXISTS (
    SELECT 1
    FROM public.company_users me
    JOIN public.company_users target
      ON target.company_id = me.company_id
    WHERE me.user_id = v_caller
      AND me.role = 'admin'
      AND target.user_id = p_user_id
  ) INTO v_shares_company;

  IF NOT (v_is_super OR v_shares_company) THEN
    RAISE EXCEPTION 'Only super admins or company admins can unblock users';
  END IF;

  UPDATE public.profiles
     SET is_blocked = false,
         blocked_reason = ''
   WHERE user_id = p_user_id;

  RETURN true;
END;
$function$;