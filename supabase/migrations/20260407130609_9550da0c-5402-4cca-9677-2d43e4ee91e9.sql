
CREATE TABLE public.user_permission_overrides (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  permission_key text NOT NULL,
  value boolean NOT NULL,
  overridden_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, user_id, permission_key)
);

ALTER TABLE public.user_permission_overrides ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Company admins can select overrides"
ON public.user_permission_overrides
FOR SELECT
TO authenticated
USING (
  is_company_admin(auth.uid(), company_id) OR is_superuser_email()
);

CREATE POLICY "Users can view own overrides"
ON public.user_permission_overrides
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Company admins can insert overrides"
ON public.user_permission_overrides
FOR INSERT
TO authenticated
WITH CHECK (
  is_company_admin(auth.uid(), company_id) OR is_superuser_email()
);

CREATE POLICY "Company admins can update overrides"
ON public.user_permission_overrides
FOR UPDATE
TO authenticated
USING (
  is_company_admin(auth.uid(), company_id) OR is_superuser_email()
);

CREATE POLICY "Company admins can delete overrides"
ON public.user_permission_overrides
FOR DELETE
TO authenticated
USING (
  is_company_admin(auth.uid(), company_id) OR is_superuser_email()
);
