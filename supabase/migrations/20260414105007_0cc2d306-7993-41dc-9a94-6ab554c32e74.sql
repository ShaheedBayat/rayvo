
DROP POLICY IF EXISTS "cu_select_v2" ON public.company_users;

CREATE POLICY "cu_select_v2"
ON public.company_users
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR is_superuser_email()
  OR has_company_access(auth.uid(), company_id)
);
