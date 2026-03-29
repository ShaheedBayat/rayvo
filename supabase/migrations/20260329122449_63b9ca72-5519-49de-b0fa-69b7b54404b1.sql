DROP POLICY IF EXISTS "companies_select_public_shared" ON public.companies;

CREATE POLICY "companies_select_public_shared" ON public.companies
  FOR SELECT TO anon
  USING (id IN (
    SELECT invoices.company_id FROM invoices
    WHERE invoices.share_token IS NOT NULL
  ));