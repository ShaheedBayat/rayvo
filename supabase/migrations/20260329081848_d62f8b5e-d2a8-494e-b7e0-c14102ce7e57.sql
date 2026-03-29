
-- ============================================
-- FIX: Strict company-level data isolation
-- ============================================

-- 1. Fix COMPANIES table: only show companies user is a member of (or super admin)
DROP POLICY IF EXISTS "Users can view own companies" ON public.companies;
CREATE POLICY "Users can view own companies" ON public.companies
FOR SELECT TO authenticated
USING (public.has_company_access(auth.uid(), id));

DROP POLICY IF EXISTS "Users can update own companies" ON public.companies;
CREATE POLICY "Users can update own companies" ON public.companies
FOR UPDATE TO authenticated
USING (public.has_company_access(auth.uid(), id));

DROP POLICY IF EXISTS "Users can delete own companies" ON public.companies;
CREATE POLICY "Users can delete own companies" ON public.companies
FOR DELETE TO authenticated
USING (owner_id = auth.uid() OR public.is_super_admin(auth.uid()));

-- 2. Fix INVOICES table
DROP POLICY IF EXISTS "Users can view own invoices" ON public.invoices;
CREATE POLICY "Users can view own invoices" ON public.invoices
FOR SELECT TO authenticated
USING (public.has_company_access(auth.uid(), company_id));

DROP POLICY IF EXISTS "Users can update own invoices" ON public.invoices;
CREATE POLICY "Users can update own invoices" ON public.invoices
FOR UPDATE TO authenticated
USING (public.has_company_access(auth.uid(), company_id));

DROP POLICY IF EXISTS "Users can delete own invoices" ON public.invoices;
CREATE POLICY "Users can delete own invoices" ON public.invoices
FOR DELETE TO authenticated
USING (public.has_company_access(auth.uid(), company_id));

-- 3. Fix CUSTOMERS table
DROP POLICY IF EXISTS "Users can view own customers" ON public.customers;
CREATE POLICY "Users can view own customers" ON public.customers
FOR SELECT TO authenticated
USING (public.has_company_access(auth.uid(), company_id));

DROP POLICY IF EXISTS "Users can update own customers" ON public.customers;
CREATE POLICY "Users can update own customers" ON public.customers
FOR UPDATE TO authenticated
USING (public.has_company_access(auth.uid(), company_id));

DROP POLICY IF EXISTS "Users can delete own customers" ON public.customers;
CREATE POLICY "Users can delete own customers" ON public.customers
FOR DELETE TO authenticated
USING (public.has_company_access(auth.uid(), company_id));

-- 4. Fix QUOTES table
DROP POLICY IF EXISTS "Users can view own quotes" ON public.quotes;
CREATE POLICY "Users can view own quotes" ON public.quotes
FOR SELECT TO authenticated
USING (public.has_company_access(auth.uid(), company_id));

DROP POLICY IF EXISTS "Users can update own quotes" ON public.quotes;
CREATE POLICY "Users can update own quotes" ON public.quotes
FOR UPDATE TO authenticated
USING (public.has_company_access(auth.uid(), company_id));

DROP POLICY IF EXISTS "Users can delete own quotes" ON public.quotes;
CREATE POLICY "Users can delete own quotes" ON public.quotes
FOR DELETE TO authenticated
USING (public.has_company_access(auth.uid(), company_id));

-- 5. Fix EXPENSES table
DROP POLICY IF EXISTS "Users can view own expenses" ON public.expenses;
CREATE POLICY "Users can view own expenses" ON public.expenses
FOR SELECT TO authenticated
USING (public.has_company_access(auth.uid(), company_id));

DROP POLICY IF EXISTS "Users can update own expenses" ON public.expenses;
CREATE POLICY "Users can update own expenses" ON public.expenses
FOR UPDATE TO authenticated
USING (public.has_company_access(auth.uid(), company_id));

DROP POLICY IF EXISTS "Users can delete own expenses" ON public.expenses;
CREATE POLICY "Users can delete own expenses" ON public.expenses
FOR DELETE TO authenticated
USING (public.has_company_access(auth.uid(), company_id));

-- 6. Fix CREDIT_NOTES table
DROP POLICY IF EXISTS "Users can view own credit notes" ON public.credit_notes;
CREATE POLICY "Users can view own credit notes" ON public.credit_notes
FOR SELECT TO authenticated
USING (public.has_company_access(auth.uid(), company_id));

DROP POLICY IF EXISTS "Users can update own credit notes" ON public.credit_notes;
CREATE POLICY "Users can update own credit notes" ON public.credit_notes
FOR UPDATE TO authenticated
USING (public.has_company_access(auth.uid(), company_id));

DROP POLICY IF EXISTS "Users can delete own credit notes" ON public.credit_notes;
CREATE POLICY "Users can delete own credit notes" ON public.credit_notes
FOR DELETE TO authenticated
USING (public.has_company_access(auth.uid(), company_id));

-- 7. Fix RECURRING_INVOICES table
DROP POLICY IF EXISTS "Users can view own recurring" ON public.recurring_invoices;
CREATE POLICY "Users can view own recurring" ON public.recurring_invoices
FOR SELECT TO authenticated
USING (public.has_company_access(auth.uid(), company_id));

DROP POLICY IF EXISTS "Users can update own recurring" ON public.recurring_invoices;
CREATE POLICY "Users can update own recurring" ON public.recurring_invoices
FOR UPDATE TO authenticated
USING (public.has_company_access(auth.uid(), company_id));

DROP POLICY IF EXISTS "Users can delete own recurring" ON public.recurring_invoices;
CREATE POLICY "Users can delete own recurring" ON public.recurring_invoices
FOR DELETE TO authenticated
USING (public.has_company_access(auth.uid(), company_id));

-- 8. Fix PRODUCTS table
DROP POLICY IF EXISTS "Users can view own products" ON public.products;
CREATE POLICY "Users can view own products" ON public.products
FOR SELECT TO authenticated
USING (public.has_company_access(auth.uid(), company_id));

DROP POLICY IF EXISTS "Users can update own products" ON public.products;
CREATE POLICY "Users can update own products" ON public.products
FOR UPDATE TO authenticated
USING (public.has_company_access(auth.uid(), company_id));

DROP POLICY IF EXISTS "Users can delete own products" ON public.products;
CREATE POLICY "Users can delete own products" ON public.products
FOR DELETE TO authenticated
USING (public.has_company_access(auth.uid(), company_id));

-- 9. Fix TAX_RATES table
DROP POLICY IF EXISTS "Users can view own tax rates" ON public.tax_rates;
CREATE POLICY "Users can view own tax rates" ON public.tax_rates
FOR SELECT TO authenticated
USING (public.has_company_access(auth.uid(), company_id));

DROP POLICY IF EXISTS "Users can update own tax rates" ON public.tax_rates;
CREATE POLICY "Users can update own tax rates" ON public.tax_rates
FOR UPDATE TO authenticated
USING (public.has_company_access(auth.uid(), company_id));

DROP POLICY IF EXISTS "Users can delete own tax rates" ON public.tax_rates;
CREATE POLICY "Users can delete own tax rates" ON public.tax_rates
FOR DELETE TO authenticated
USING (public.has_company_access(auth.uid(), company_id));

-- 10. Fix VAT_LEDGER_ENTRIES table
DROP POLICY IF EXISTS "Users can view own vat entries" ON public.vat_ledger_entries;
CREATE POLICY "Users can view own vat entries" ON public.vat_ledger_entries
FOR SELECT TO authenticated
USING (public.has_company_access(auth.uid(), company_id));

DROP POLICY IF EXISTS "Users can update own vat entries" ON public.vat_ledger_entries;
CREATE POLICY "Users can update own vat entries" ON public.vat_ledger_entries
FOR UPDATE TO authenticated
USING (public.has_company_access(auth.uid(), company_id));

-- 11. Fix CUSTOMER_CONTACTS table
DROP POLICY IF EXISTS "Users can view own customer contacts" ON public.customer_contacts;
CREATE POLICY "Users can view own customer contacts" ON public.customer_contacts
FOR SELECT TO authenticated
USING (
  customer_id IN (
    SELECT id FROM public.customers WHERE public.has_company_access(auth.uid(), company_id)
  )
);

DROP POLICY IF EXISTS "Users can update own customer contacts" ON public.customer_contacts;
CREATE POLICY "Users can update own customer contacts" ON public.customer_contacts
FOR UPDATE TO authenticated
USING (
  customer_id IN (
    SELECT id FROM public.customers WHERE public.has_company_access(auth.uid(), company_id)
  )
);

DROP POLICY IF EXISTS "Users can delete own customer contacts" ON public.customer_contacts;
CREATE POLICY "Users can delete own customer contacts" ON public.customer_contacts
FOR DELETE TO authenticated
USING (
  customer_id IN (
    SELECT id FROM public.customers WHERE public.has_company_access(auth.uid(), company_id)
  )
);

-- 12. Fix COMPANY_INVOICE_COUNTERS - use has_company_access
DROP POLICY IF EXISTS "Users can view own counters" ON public.company_invoice_counters;
CREATE POLICY "Users can view own counters" ON public.company_invoice_counters
FOR SELECT TO authenticated
USING (public.has_company_access(auth.uid(), company_id));

DROP POLICY IF EXISTS "Users can insert own counters" ON public.company_invoice_counters;
CREATE POLICY "Users can insert own counters" ON public.company_invoice_counters
FOR INSERT TO authenticated
WITH CHECK (public.has_company_access(auth.uid(), company_id));

DROP POLICY IF EXISTS "Users can update own counters" ON public.company_invoice_counters;
CREATE POLICY "Users can update own counters" ON public.company_invoice_counters
FOR UPDATE TO authenticated
USING (public.has_company_access(auth.uid(), company_id));

-- 13. Fix COMPANY_QUOTE_COUNTERS
DROP POLICY IF EXISTS "Users can view own quote counters" ON public.company_quote_counters;
CREATE POLICY "Users can view own quote counters" ON public.company_quote_counters
FOR SELECT TO authenticated
USING (public.has_company_access(auth.uid(), company_id));

DROP POLICY IF EXISTS "Users can insert own quote counters" ON public.company_quote_counters;
CREATE POLICY "Users can insert own quote counters" ON public.company_quote_counters
FOR INSERT TO authenticated
WITH CHECK (public.has_company_access(auth.uid(), company_id));

DROP POLICY IF EXISTS "Users can update own quote counters" ON public.company_quote_counters;
CREATE POLICY "Users can update own quote counters" ON public.company_quote_counters
FOR UPDATE TO authenticated
USING (public.has_company_access(auth.uid(), company_id));

-- 14. Fix COMPANY_CREDIT_NOTE_COUNTERS
DROP POLICY IF EXISTS "Users can view own cn counters" ON public.company_credit_note_counters;
CREATE POLICY "Users can view own cn counters" ON public.company_credit_note_counters
FOR SELECT TO authenticated
USING (public.has_company_access(auth.uid(), company_id));

DROP POLICY IF EXISTS "Users can insert own cn counters" ON public.company_credit_note_counters;
CREATE POLICY "Users can insert own cn counters" ON public.company_credit_note_counters
FOR INSERT TO authenticated
WITH CHECK (public.has_company_access(auth.uid(), company_id));

DROP POLICY IF EXISTS "Users can update own cn counters" ON public.company_credit_note_counters;
CREATE POLICY "Users can update own cn counters" ON public.company_credit_note_counters
FOR UPDATE TO authenticated
USING (public.has_company_access(auth.uid(), company_id));
