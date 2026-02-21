
-- Allow anon to read company data for shared invoices
CREATE POLICY "Public can view companies for shared invoices" ON public.companies
  FOR SELECT TO anon
  USING (id IN (SELECT company_id FROM public.invoices WHERE share_token IS NOT NULL));
