ALTER TABLE public.team_invites
ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_team_invites_company_email_status
ON public.team_invites (company_id, status, lower(email));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'staff')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.company_users (company_id, user_id, role)
  SELECT ti.company_id, NEW.id, ti.role
  FROM public.team_invites ti
  WHERE ti.company_id IS NOT NULL
    AND ti.status = 'pending'
    AND lower(ti.email) = lower(NEW.email)
  ON CONFLICT (company_id, user_id) DO NOTHING;

  UPDATE public.team_invites
  SET status = 'accepted',
      accepted_at = now()
  WHERE company_id IS NOT NULL
    AND status = 'pending'
    AND lower(email) = lower(NEW.email);

  RETURN NEW;
END;
$function$;