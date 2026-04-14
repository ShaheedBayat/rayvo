
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO public
USING (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.company_users cu1
    JOIN public.company_users cu2 ON cu1.company_id = cu2.company_id
    WHERE cu1.user_id = auth.uid()
      AND cu2.user_id = profiles.user_id
  )
);
