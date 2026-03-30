
-- Add company_id to activity_log
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

-- Drop old RLS policies
DROP POLICY IF EXISTS "Users can create activity" ON public.activity_log;
DROP POLICY IF EXISTS "Users can view own activity" ON public.activity_log;

-- New INSERT policy: must be owner and have company access
CREATE POLICY "activity_log_insert" ON public.activity_log
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- New SELECT policy: company-scoped via has_company_access
CREATE POLICY "activity_log_select" ON public.activity_log
  FOR SELECT TO authenticated
  USING (has_company_access(auth.uid(), company_id));
