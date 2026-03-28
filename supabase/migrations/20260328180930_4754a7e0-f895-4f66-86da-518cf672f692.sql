
-- 1. Create company_users table for company-scoped roles
CREATE TABLE public.company_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'viewer',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, user_id)
);

ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;

-- 2. Add is_super_admin flag to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_super_admin boolean NOT NULL DEFAULT false;

-- 3. Security definer function: get company role
CREATE OR REPLACE FUNCTION public.get_company_role(_user_id uuid, _company_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.company_users
  WHERE user_id = _user_id AND company_id = _company_id
  LIMIT 1;
$$;

-- 4. Security definer function: check super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM public.profiles WHERE user_id = _user_id),
    false
  );
$$;

-- 5. Security definer function: check if user has company access
CREATE OR REPLACE FUNCTION public.has_company_access(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    public.is_super_admin(_user_id) 
    OR EXISTS (
      SELECT 1 FROM public.company_users
      WHERE user_id = _user_id AND company_id = _company_id
    );
$$;

-- 6. Security definer function: check company role is at least a certain level
CREATE OR REPLACE FUNCTION public.has_company_role(_user_id uuid, _company_id uuid, _min_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    public.is_super_admin(_user_id)
    OR EXISTS (
      SELECT 1 FROM public.company_users
      WHERE user_id = _user_id 
        AND company_id = _company_id
        AND (
          (_min_role = 'viewer') OR
          (_min_role = 'staff' AND role IN ('staff', 'admin')) OR
          (_min_role = 'admin' AND role = 'admin')
        )
    );
$$;

-- 7. RLS policies for company_users table
CREATE POLICY "Super admins can view all company_users"
  ON public.company_users FOR SELECT
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Users can view own company memberships"
  ON public.company_users FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Company admins can manage members"
  ON public.company_users FOR INSERT
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR public.has_company_role(auth.uid(), company_id, 'admin')
  );

CREATE POLICY "Company admins can update members"
  ON public.company_users FOR UPDATE
  USING (
    public.is_super_admin(auth.uid())
    OR public.has_company_role(auth.uid(), company_id, 'admin')
  );

CREATE POLICY "Company admins can delete members"
  ON public.company_users FOR DELETE
  USING (
    public.is_super_admin(auth.uid())
    OR public.has_company_role(auth.uid(), company_id, 'admin')
  );

-- 8. Seed: existing company owners become admins in company_users
INSERT INTO public.company_users (company_id, user_id, role)
SELECT id, owner_id, 'admin'
FROM public.companies
ON CONFLICT (company_id, user_id) DO NOTHING;

-- 9. Set known super admins
UPDATE public.profiles SET is_super_admin = true 
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email IN ('shaheedbayat1@gmail.com', 'mo@rayn.co.za')
);

-- 10. Update handle_new_user trigger to NOT insert into user_roles (keep backward compat but also handle company_users)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  -- Still insert into user_roles for backward compatibility
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'staff');
  RETURN NEW;
END;
$function$;
