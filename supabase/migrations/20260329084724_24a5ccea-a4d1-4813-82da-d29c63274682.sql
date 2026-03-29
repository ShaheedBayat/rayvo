-- Fix self-referential RLS on companies that blocks INSERT ... RETURNING for first-time onboarding
DROP POLICY IF EXISTS "Users can view own companies" ON public.companies;
DROP POLICY IF EXISTS "Users can update own companies" ON public.companies;
DROP POLICY IF EXISTS "Users can create companies" ON public.companies;

CREATE POLICY "Users can create companies"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can view own companies"
ON public.companies
FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
  OR public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.company_users cu
    WHERE cu.company_id = companies.id
      AND cu.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own companies"
ON public.companies
FOR UPDATE
TO authenticated
USING (
  owner_id = auth.uid()
  OR public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.company_users cu
    WHERE cu.company_id = companies.id
      AND cu.user_id = auth.uid()
  )
)
WITH CHECK (
  owner_id = auth.uid()
  OR public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.company_users cu
    WHERE cu.company_id = companies.id
      AND cu.user_id = auth.uid()
  )
);