
Problem found:

1. Your data is not gone
- The backend still has the old companies:
  - Apple
  - McDonalds
  - Zensure
- The backend still has invoices linked to Apple and McDonalds.
- So this is not a data-loss problem. It is an access + selection problem.

2. Main backend breakage
- The current `companies` fetch is failing because the `company_users` RLS policy is recursive.
- I confirmed the app is getting:
```text
infinite recursion detected in policy for relation "company_users"
```
- That breaks the company list query, which then breaks:
  - the company switcher dropdown
  - superuser visibility of all companies
  - normal admin visibility of assigned companies
  - onboarding/company refresh after creation

3. Main frontend breakage
- The app stores `activeCompanyId` in localStorage.
- When the company list fails or changes, the UI can stay pinned to an old company like Apple.
- Invoices are fetched by `activeCompanyId`, so if that ID points to the wrong company, it looks like invoices “disappeared” even though they still exist under other companies.

4. Why new companies “disappear”
- Company creation is succeeding.
- But immediately after, the app refetches companies.
- That refetch hits the recursive RLS error, so the newly created company never shows up in the visible list.

What I would fix:

1. Repair backend access model
- Replace the current recursive `company_users` RLS policies with non-recursive policies.
- Keep the model exactly as you described:
  - 3 superusers by email/global access
  - 4 roles only: superuser, admin, staff, viewer
  - admins can create/switch only among their own companies
  - staff/viewers only see assigned company data
- Use security-definer functions for membership/role checks where needed so policies do not reference `company_users` from inside `company_users` policies.

2. Re-align company/data visibility rules
- Make `companies` readable when:
  - user is one of the 3 superusers, or
  - user has a membership row in `company_users`, or
  - user owns the company
- Make `invoices`, `quotes`, `customers`, `expenses`, etc. depend on company membership access only.

3. Simplify frontend company state
- Rework `useActiveCompany` so it does one clean load:
  - wait for auth
  - fetch visible companies
  - validate localStorage company id against visible companies
  - if invalid, reset to first visible company
- Remove any stale-company behavior that allows the UI to display a company not present in the fetched list.

4. Fix routing/control flow
- Keep exactly one routing decision path:
  - superuser => app immediately
  - user with at least one visible company => app immediately
  - user with zero companies => create company
- No routing before auth + company fetch completes.

5. Fix company creation flow
- After creating a company, create the admin membership row.
- Then refetch companies using the repaired access rules.
- Set the new company as active only after it is confirmed visible.

Expected result after implementation:
- Superusers see all companies and can switch between them.
- Admins see only companies they own/are assigned to, and can create multiple companies.
- Staff/viewers only see assigned company data.
- Apple/Zensure/McDonalds reappear.
- Existing invoices reappear under the correct selected company.
- New companies stop “disappearing”.
- The top-left company switcher returns.

Technical details:
```text
Current root cause chain

company_users RLS policy references company_users
-> recursion error on SELECT
-> companies query fails
-> company switcher gets empty/partial state
-> activeCompany falls back to stale localStorage/current value
-> invoice queries filter by wrong company_id
-> user thinks companies/invoices disappeared
```

Implementation scope:
- Backend policy fix is required. Frontend-only changes will not solve this.
- Frontend cleanup is also required so stale selected-company state cannot mask backend fixes.

Suggested order of work:
1. Fix `company_users` RLS recursion
2. Fix `companies`/data visibility policies
3. Refactor `useActiveCompany`
4. Tighten routing guards
5. Verify company creation + switching flow end-to-end
