

## Problem

The `companies_select_public_shared` RLS policy on the `companies` table makes any company with a shared invoice visible to ALL users (including `anon`). Apple has invoices with `share_token` set, so every new signup sees Apple in their company list. The routing guard sees `companies.length > 0` and sends them straight to the dashboard instead of onboarding.

## Fix

### 1. Database migration — scope the public shared policy

Replace the current `companies_select_public_shared` policy so it only applies to `anon` users (for the public invoice view page), not to `authenticated` users:

```sql
DROP POLICY IF EXISTS "companies_select_public_shared" ON public.companies;

CREATE POLICY "companies_select_public_shared" ON public.companies
  FOR SELECT TO anon
  USING (id IN (
    SELECT invoices.company_id FROM invoices
    WHERE invoices.share_token IS NOT NULL
  ));
```

This single change means:
- **Anon users** can still view company details on the public invoice page (existing feature works)
- **Authenticated users** only see companies they own, are a member of, or are a superuser — via the existing `companies_select` policy
- **New signups** get zero companies → routed to onboarding correctly

### 2. No frontend changes needed

The routing guards and `useActiveCompany` logic are correct. The only issue is that the database is leaking Apple's visibility to all authenticated users.

### Technical details

```text
Current flow for new user:
  1. Signs up
  2. fetchCompanies() runs
  3. companies_select returns nothing (correct)
  4. companies_select_public_shared returns Apple (WRONG - applies to authenticated too)
  5. companies = [Apple]
  6. CompanyRequired sees length > 0 → skips onboarding

Fixed flow:
  1. Signs up  
  2. fetchCompanies() runs
  3. companies_select returns nothing (correct)
  4. companies_select_public_shared only applies to anon role → skipped
  5. companies = []
  6. CompanyRequired sees length === 0 → redirects to onboarding
```

