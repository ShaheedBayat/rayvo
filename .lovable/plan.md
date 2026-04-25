## The problem

You paid R100 against a 50% deposit invoice on a R200 job — but the invoice still says R100 outstanding. That's because the system is currently storing the **full R200** on the deposit invoice and only treating the 50% as metadata. So to the system, your invoice is for R200, you've paid R100, and R100 is still owed on it.

## What industry standard does (Xero, QuickBooks, FreshBooks)

A **deposit invoice is its own invoice for the deposit amount only**. They're two standalone documents that happen to be linked:

- **INV-00005 (Deposit)** — Total: R100, Due: R100. Customer pays R100 → marked **Paid** ✅
- **INV-00006 (Balance)** — auto-created for the remaining R100. Customer pays R100 → marked **Paid** ✅

Together they cover the R200 job. Each invoice's total = what's actually owed on that document. No phantom outstanding balances.

## Plan

### 1. Change deposit invoice to store the deposit amount only

In `CreateInvoice.tsx`, when "Deposit" is toggled on:
- Calculate the deposit amount (% of job OR fixed) once at creation
- Save the invoice with **a single line item for the deposit amount** (e.g. `"50% deposit — Job total R200"` @ R100)
- Keep the line items the user entered stashed in `notes` or a new `parent_total` column so the balance invoice can be built later. Simplest path: store the original full-job items in the deposit invoice's `notes` JSON or add a `job_total` numeric column to `invoices`.

Recommended: add a `job_total` column on `invoices` (nullable numeric). For deposit invoices, this holds the original full-job total. Standard invoices leave it null.

### 2. Update balance auto-creation logic

In `InvoiceView.tsx` `recalculateAndUpdateStatus`, when the deposit invoice is fully paid:
- Balance amount = `job_total − deposit invoice total` (which is exactly the remainder, e.g. R200 − R100 = R100)
- Create the balance invoice for that amount (already works, just sourcing the number differently)

### 3. Update the deposit settings UI in CreateInvoice

The "Deposit Settings" preview already shows Deposit / Balance breakdown — keep it, but make it crystal clear:
> "This invoice will be created for **R100** (the deposit). When paid, a separate balance invoice for **R100** will be auto-generated."

### 4. Update the deposit banner on InvoiceView

Currently says: "💰 Deposit Invoice — 50% of total". Change to:
> "💰 Deposit Invoice — R100 (50% of R200 job). Balance invoice will be created when paid."

### 5. Backfill / migration handling

For your existing INV-00005 (the broken one):
- Option A: Delete it and recreate (cleanest, since it's a draft/sent test)
- Option B: One-off SQL to fix that specific record

I'd recommend Option A since you're testing — just void/delete INV-00005 and create a fresh one with the new logic.

### 6. Files affected

- `supabase` migration: add `job_total numeric` column to `invoices`
- `src/types/invoice.ts`: add `jobTotal?: number` to `Invoice` type
- `src/hooks/useInvoiceStore.ts`: map the new column
- `src/pages/CreateInvoice.tsx`: build deposit invoice with deposit-only line item + store `jobTotal`
- `src/pages/InvoiceView.tsx`: balance creation reads `jobTotal`; deposit banner copy updated
- `src/components/invoice/InvoiceDocument.tsx`: optional — show "Deposit (50% of R200)" label on the printable PDF

## Result

After the fix:
- Create R200 job, 50% deposit → **INV-0005 created for R100**
- Pay R100 → **INV-0005 marked Paid** ✅
- **INV-0006 auto-created for R100** (the balance)
- Pay R100 on INV-0006 → **Paid** ✅

No more phantom outstanding balance. Matches what Xero/QuickBooks do.
