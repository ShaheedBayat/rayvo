

## Problem

You restored the frontend code to yesterday's commit, but **database migrations are permanent** — they don't revert with code. Today's migrations changed the RLS policies on the `companies` table. The current `companies_select` policy uses `is_super_admin(auth.uid())`, which checks `profiles.is_super_admin`. If your superuser profiles don't have `is_super_admin = true`, the SELECT returns zero companies, so the dropdown is empty and you see nothing.

## Root Cause

The `is_super_admin` flag is set by a trigger (`check_super_admin_on_profile`) that fires on INSERT. But your profiles were created **before** this trigger existed, so `is_super_admin` is `false`.

## Fix (1 database migration, no frontend changes)

**Single migration** to backfill the `is_super_admin` flag for the three superuser accounts:

```sql
UPDATE public.profiles
SET is_super_admin = true
WHERE user_id IN (
  SELECT id FROM auth.users
  WHERE email IN ('shaheedbayat1@gmail.com', 'mo@rayn.co.za', 'owencrowie@gmail.com')
);
```

This ensures the `is_super_admin()` function returns `true` for superusers, which makes the `companies_select` RLS policy grant access to all companies. The company dropdown and all data will then appear correctly.

No frontend code changes are needed — the restored code already has the company switcher and superuser logic.

