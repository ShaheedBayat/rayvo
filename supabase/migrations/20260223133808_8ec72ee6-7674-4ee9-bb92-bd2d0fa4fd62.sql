
-- Drop the broken restrictive policy for public shared invoice company viewing
DROP POLICY IF EXISTS "Public can view companies for shared invoices" ON public.companies;

-- Recreate it as PERMISSIVE so it works as an OR with the owner policy
CREATE POLICY "Public can view companies for shared invoices"
ON public.companies
FOR SELECT
USING (id IN (SELECT company_id FROM invoices WHERE share_token IS NOT NULL));

-- Also need to make the owner SELECT policy permissive
DROP POLICY IF EXISTS "Users can view own companies" ON public.companies;

CREATE POLICY "Users can view own companies"
ON public.companies
FOR SELECT
USING ((owner_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- Fix the INSERT policy to be permissive too
DROP POLICY IF EXISTS "Users can create companies" ON public.companies;

CREATE POLICY "Users can create companies"
ON public.companies
FOR INSERT
WITH CHECK (owner_id = auth.uid());

-- Fix UPDATE policy
DROP POLICY IF EXISTS "Users can update own companies" ON public.companies;

CREATE POLICY "Users can update own companies"
ON public.companies
FOR UPDATE
USING ((owner_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- Fix DELETE policy
DROP POLICY IF EXISTS "Users can delete own companies" ON public.companies;

CREATE POLICY "Users can delete own companies"
ON public.companies
FOR DELETE
USING ((owner_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
