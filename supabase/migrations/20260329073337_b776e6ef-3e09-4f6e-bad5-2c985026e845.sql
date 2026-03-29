
-- Allow company owners to insert themselves into company_users
CREATE POLICY "Company owners can link themselves"
ON public.company_users
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND company_id IN (
    SELECT id FROM public.companies WHERE owner_id = auth.uid()
  )
);
