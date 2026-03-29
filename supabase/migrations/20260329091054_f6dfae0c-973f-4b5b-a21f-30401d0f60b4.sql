
-- NUCLEAR RESET: companies + company_users RLS

DROP POLICY IF EXISTS "Users can create companies" ON public.companies;
DROP POLICY IF EXISTS "Users can view own companies" ON public.companies;
DROP POLICY IF EXISTS "Users can update own companies" ON public.companies;
DROP POLICY IF EXISTS "Users can delete own companies" ON public.companies;
DROP POLICY IF EXISTS "Public can view companies for shared invoices" ON public.companies;
DROP POLICY IF EXISTS "companies_select" ON public.companies;
DROP POLICY IF EXISTS "companies_insert" ON public.companies;
DROP POLICY IF EXISTS "companies_update" ON public.companies;

DROP POLICY IF EXISTS "Company admins can manage members" ON public.company_users;
DROP POLICY IF EXISTS "Company admins can update members" ON public.company_users;
DROP POLICY IF EXISTS "Company admins can delete members" ON public.company_users;
DROP POLICY IF EXISTS "Company owners can link themselves" ON public.company_users;
DROP POLICY IF EXISTS "Super admins can view all company_users" ON public.company_users;
DROP POLICY IF EXISTS "Users can view own company memberships" ON public.company_users;
DROP POLICY IF EXISTS "company_users_select" ON public.company_users;
DROP POLICY IF EXISTS "company_users_insert" ON public.company_users;

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "companies_insert"
ON public.companies FOR INSERT TO authenticated
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "companies_select"
ON public.companies FOR SELECT TO authenticated
USING (
  owner_id = auth.uid()
  OR public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.company_id = companies.id AND cu.user_id = auth.uid()
  )
);

CREATE POLICY "companies_select_public_shared"
ON public.companies FOR SELECT TO anon, authenticated
USING (
  id IN (SELECT company_id FROM public.invoices WHERE share_token IS NOT NULL)
);

CREATE POLICY "companies_update"
ON public.companies FOR UPDATE TO authenticated
USING (
  owner_id = auth.uid()
  OR public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.company_id = companies.id AND cu.user_id = auth.uid()
  )
)
WITH CHECK (
  owner_id = auth.uid()
  OR public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.company_id = companies.id AND cu.user_id = auth.uid()
  )
);

CREATE POLICY "companies_delete"
ON public.companies FOR DELETE TO authenticated
USING (
  owner_id = auth.uid()
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "cu_select"
ON public.company_users FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.company_users cu2
    WHERE cu2.company_id = company_users.company_id
      AND cu2.user_id = auth.uid()
      AND cu2.role = 'admin'
  )
);

CREATE POLICY "cu_insert"
ON public.company_users FOR INSERT TO authenticated
WITH CHECK (
  (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid()
  ))
  OR public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.company_users cu2
    WHERE cu2.company_id = company_users.company_id
      AND cu2.user_id = auth.uid()
      AND cu2.role = 'admin'
  )
);

CREATE POLICY "cu_update"
ON public.company_users FOR UPDATE TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.company_users cu2
    WHERE cu2.company_id = company_users.company_id
      AND cu2.user_id = auth.uid()
      AND cu2.role = 'admin'
  )
);

CREATE POLICY "cu_delete"
ON public.company_users FOR DELETE TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.company_users cu2
    WHERE cu2.company_id = company_users.company_id
      AND cu2.user_id = auth.uid()
      AND cu2.role = 'admin'
  )
);

INSERT INTO public.company_users (company_id, user_id, role)
SELECT c.id, c.owner_id, 'admin'
FROM public.companies c
WHERE NOT EXISTS (
  SELECT 1 FROM public.company_users cu
  WHERE cu.company_id = c.id AND cu.user_id = c.owner_id
);
