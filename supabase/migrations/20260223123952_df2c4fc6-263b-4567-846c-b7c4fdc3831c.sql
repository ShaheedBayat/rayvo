
-- Fix all RESTRICTIVE policies on customers table - drop and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Users can create customers" ON public.customers;
DROP POLICY IF EXISTS "Users can delete own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can update own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can view own customers" ON public.customers;

CREATE POLICY "Users can create customers" ON public.customers FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can view own customers" ON public.customers FOR SELECT USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can update own customers" ON public.customers FOR UPDATE USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can delete own customers" ON public.customers FOR DELETE USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Fix all RESTRICTIVE policies on companies table
DROP POLICY IF EXISTS "Users can create companies" ON public.companies;
DROP POLICY IF EXISTS "Users can delete own companies" ON public.companies;
DROP POLICY IF EXISTS "Users can update own companies" ON public.companies;
DROP POLICY IF EXISTS "Users can view own companies" ON public.companies;
DROP POLICY IF EXISTS "Public can view companies for shared invoices" ON public.companies;

CREATE POLICY "Users can create companies" ON public.companies FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can view own companies" ON public.companies FOR SELECT USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can update own companies" ON public.companies FOR UPDATE USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can delete own companies" ON public.companies FOR DELETE USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Public can view companies for shared invoices" ON public.companies FOR SELECT USING (id IN (SELECT company_id FROM invoices WHERE share_token IS NOT NULL));

-- Fix global_settings policies too
DROP POLICY IF EXISTS "Users can insert own settings" ON public.global_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON public.global_settings;
DROP POLICY IF EXISTS "Users can view own settings" ON public.global_settings;

CREATE POLICY "Users can insert own settings" ON public.global_settings FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update own settings" ON public.global_settings FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users can view own settings" ON public.global_settings FOR SELECT USING (owner_id = auth.uid());

-- Fix recurring_invoices policies
DROP POLICY IF EXISTS "Users can create recurring" ON public.recurring_invoices;
DROP POLICY IF EXISTS "Users can delete own recurring" ON public.recurring_invoices;
DROP POLICY IF EXISTS "Users can update own recurring" ON public.recurring_invoices;
DROP POLICY IF EXISTS "Users can view own recurring" ON public.recurring_invoices;

CREATE POLICY "Users can create recurring" ON public.recurring_invoices FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can view own recurring" ON public.recurring_invoices FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Users can update own recurring" ON public.recurring_invoices FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users can delete own recurring" ON public.recurring_invoices FOR DELETE USING (owner_id = auth.uid());

-- Fix invoices policies
DROP POLICY IF EXISTS "Users can create invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can delete own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can update own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can view own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Public can view shared invoices" ON public.invoices;

CREATE POLICY "Users can create invoices" ON public.invoices FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can view own invoices" ON public.invoices FOR SELECT USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can update own invoices" ON public.invoices FOR UPDATE USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can delete own invoices" ON public.invoices FOR DELETE USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Public can view shared invoices" ON public.invoices FOR SELECT USING (share_token IS NOT NULL);

-- Fix deletion_log policies
DROP POLICY IF EXISTS "Users can insert own deletion logs" ON public.deletion_log;
DROP POLICY IF EXISTS "Users can view own deletion logs" ON public.deletion_log;

CREATE POLICY "Users can insert own deletion logs" ON public.deletion_log FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can view own deletion logs" ON public.deletion_log FOR SELECT USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Fix profiles policies
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Fix user_roles policies
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
