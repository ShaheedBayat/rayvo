
-- Ensure only the 3 specified users are super admins
-- First reset all to false
UPDATE public.profiles SET is_super_admin = false WHERE is_super_admin = true;

-- Set the two existing accounts as super admins
UPDATE public.profiles SET is_super_admin = true 
WHERE display_name IN ('mo@rayn.co.za', 'shaheedbayat1@gmail.com');

-- Create a trigger to auto-set super admin for owencrowie@gmail.com on profile creation
CREATE OR REPLACE FUNCTION public.check_super_admin_on_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_email text;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = NEW.user_id;
  IF v_email IN ('owencrowie@gmail.com', 'mo@rayn.co.za', 'shaheedbayat1@gmail.com') THEN
    NEW.is_super_admin := true;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER set_super_admin_on_profile_insert
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_super_admin_on_profile();
