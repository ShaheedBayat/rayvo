
-- Step 1: Create a non-recursive helper to check if user is admin of a company
-- This reads company_users but is SECURITY DEFINER so it bypasses RLS
CREATE OR REPLACE FUNCTION public.is_company_admin(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_users
    WHERE user_id = _user_id
      AND company_id = _company_id
      AND role = 'admin'
  );
$$;

-- Create a helper to check superuser by email (no dependency on profiles)
CREATE OR REPLACE FUNCTION public.is_superuser_email()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
      AND email IN ('shaheedbayat1@gmail.com', 'mo@rayn.co.za', 'owencrowie@gmail.com')
  );
$$;

-- Step 2: Drop all existing company_users policies
DROP POLICY IF EXISTS "cu_select" ON public.company_users;
DROP POLICY IF EXISTS "cu_insert" ON public.company_users;
DROP POLICY IF EXISTS "cu_update" ON public.company_users;
DROP POLICY IF EXISTS "cu_delete" ON public.company_users;
DROP POLICY IF EXISTS "company_users_select" ON public.company_users;
DROP POLICY IF EXISTS "company_users_select_fixed" ON public.company_users;
DROP POLICY IF EXISTS "Users can view company memberships" ON public.company_users;

-- Step 3: Create non-recursive policies for company_users
-- SELECT: user can see own rows OR superuser sees all
CREATE POLICY "cu_select_v2" ON public.company_users
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_superuser_email());

-- INSERT: owner of company can add members, or superuser, or existing admin (use security definer)
CREATE POLICY "cu_insert_v2" ON public.company_users
  FOR INSERT TO authenticated
  WITH CHECK (
    -- User adding themselves to a company they own
    (user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.companies c WHERE c.id = company_users.company_id AND c.owner_id = auth.uid()
    ))
    OR public.is_superuser_email()
    OR public.is_company_admin(auth.uid(), company_id)
  );

-- UPDATE: superuser or admin of that company (non-recursive via function)
CREATE POLICY "cu_update_v2" ON public.company_users
  FOR UPDATE TO authenticated
  USING (public.is_superuser_email() OR public.is_company_admin(auth.uid(), company_id));

-- DELETE: superuser or admin of that company (non-recursive via function)
CREATE POLICY "cu_delete_v2" ON public.company_users
  FOR DELETE TO authenticated
  USING (public.is_superuser_email() OR public.is_company_admin(auth.uid(), company_id));

-- Step 4: Also update companies_select to use is_superuser_email for consistency
DROP POLICY IF EXISTS "companies_select" ON public.companies;
CREATE POLICY "companies_select" ON public.companies
  FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.is_superuser_email()
    OR EXISTS (
      SELECT 1 FROM public.company_users cu
      WHERE cu.company_id = companies.id AND cu.user_id = auth.uid()
    )
  );

-- Step 5: Update companies_update and companies_delete similarly
DROP POLICY IF EXISTS "companies_update" ON public.companies;
CREATE POLICY "companies_update" ON public.companies
  FOR UPDATE TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.is_superuser_email()
    OR public.is_company_admin(auth.uid(), id)
  )
  WITH CHECK (
    owner_id = auth.uid()
    OR public.is_superuser_email()
    OR public.is_company_admin(auth.uid(), id)
  );

DROP POLICY IF EXISTS "companies_delete" ON public.companies;
CREATE POLICY "companies_delete" ON public.companies
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR public.is_superuser_email());

-- Step 6: Update has_company_access to also use is_superuser_email
CREATE OR REPLACE FUNCTION public.has_company_access(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT
    -- Check superuser by email directly
    EXISTS (SELECT 1 FROM auth.users WHERE id = _user_id AND email IN ('shaheedbayat1@gmail.com', 'mo@rayn.co.za', 'owencrowie@gmail.com'))
    OR EXISTS (
      SELECT 1 FROM public.companies
      WHERE id = _company_id AND owner_id = _user_id
    )
    OR EXISTS (
      SELECT 1 FROM public.company_users
      WHERE user_id = _user_id AND company_id = _company_id
    );
$$;
