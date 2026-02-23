
# Complete Feature Implementation Plan

This is a comprehensive plan covering every remaining gap identified by comparing the system against industry-standard invoicing platforms (Xero, FreshBooks, Wave, Zoho).

---

## Phase A: Fix Invoice Deletion and Add Voiding

### Problem
Currently, invoices at any status can be soft-deleted. This violates accounting standards -- only draft invoices should be deletable. Approved, sent, and paid invoices need a "Void" action instead.

### Changes

**Database migration:**
- Add `voided` and `partially_paid` as valid invoice statuses (no schema change needed since `status` is a text column)
- Update the `soft_delete_invoice` function to reject deletion if invoice status is not `draft`

**Files to modify:**
- `src/types/invoice.ts` -- Add `voided` and `partially_paid` to the Invoice status type
- `src/hooks/useInvoiceStore.ts` -- Add a `voidInvoice` method that sets status to `voided`
- `src/pages/InvoiceView.tsx`:
  - Remove the Delete option for non-draft invoices
  - Add a "Void Invoice" action (with confirmation dialog) for approved/sent invoices
  - Show a "VOIDED" badge for voided invoices
  - Disable all action buttons on voided invoices
- `src/pages/Invoices.tsx`:
  - Add `voided` to statusConfig
  - Add a "Voided" filter option
  - Only show delete in the dropdown for draft invoices
- `src/components/invoice/InvoiceDocument.tsx` -- Show a diagonal "VOID" watermark overlay when invoice status is `voided`

---

## Phase B: Payment Recording

### Problem
"Mark as Paid" is a simple toggle. Real systems record payment details and support partial payments.

### Changes

**Database migration:**
- Create a `payments` table:

```text
payments
  id          UUID PK DEFAULT gen_random_uuid()
  owner_id    UUID NOT NULL
  invoice_id  UUID NOT NULL
  amount      NUMERIC NOT NULL
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE
  method      TEXT NOT NULL DEFAULT 'bank_transfer'
  reference   TEXT DEFAULT ''
  notes       TEXT DEFAULT ''
  created_at  TIMESTAMPTZ DEFAULT now()
```

- Add RLS policies: owner can INSERT, SELECT, UPDATE, DELETE own payments

**Files to create:**
- `src/hooks/usePayments.ts` -- CRUD hook for payments (fetch by invoice_id, add, delete)

**Files to modify:**
- `src/pages/InvoiceView.tsx`:
  - Replace "Mark as Paid" button with "Record Payment" button
  - Add a Record Payment dialog (amount, date, method dropdown, reference, notes)
  - Show payment history section below the invoice document
  - Auto-update invoice status to `paid` when total payments >= invoice total, or `partially_paid` when payments exist but are less than the total
- `src/types/invoice.ts` -- Already updated in Phase A with `partially_paid`
- `src/pages/Invoices.tsx` -- Add `partially_paid` to statusConfig

---

## Phase C: Quote Editing

### Problem
Quotes can only be created and listed. There is no way to edit a draft quote.

### Changes

**Files to modify:**
- `src/pages/Quotes.tsx`:
  - Add an "Edit" option in the dropdown menu for draft quotes
  - Open the existing create dialog but pre-populated with the quote's data
  - On save, call `updateQuote` instead of `addQuote`

---

## Phase D: Credit Note Improvements

### Problem
Credit notes are standalone documents with no actions beyond delete. They need status changes and the ability to be applied against invoices.

### Changes

**Files to modify:**
- `src/pages/CreditNotes.tsx`:
  - Add "Mark as Approved" and "Mark as Sent" actions in the dropdown menu
  - Add an "Edit" option for draft credit notes (reuse the create dialog pre-populated)
  - Show linked invoice number in the table if `invoiceId` is set

---

## Phase E: Currency-Aware Overview and Reports

### Problem
The Overview and Reports pages pick `currency` from the first invoice. If you have invoices in multiple currencies, totals are mixed incorrectly.

### Changes

**Files to modify:**
- `src/pages/Overview.tsx`:
  - Group financial summaries by currency
  - Show separate Outstanding/Received/Overdue cards per currency, or show the dominant currency and note "mixed currencies"
- `src/pages/Reports.tsx`:
  - Group revenue, paid, outstanding, overdue totals by currency
  - Show per-currency summary cards
  - Add a Tax Summary section showing total tax collected per period

---

## Phase F: Audit Trail / Activity Log

### Problem
No record of actions taken on invoices. Professional systems log every status change.

### Changes

**Database migration:**
- Create an `activity_log` table:

```text
activity_log
  id          UUID PK DEFAULT gen_random_uuid()
  owner_id    UUID NOT NULL
  entity_type TEXT NOT NULL (e.g. 'invoice', 'quote', 'credit_note')
  entity_id   UUID NOT NULL
  action      TEXT NOT NULL (e.g. 'created', 'approved', 'sent', 'voided', 'payment_recorded')
  details     TEXT DEFAULT ''
  created_at  TIMESTAMPTZ DEFAULT now()
```

- RLS: owner can INSERT and SELECT own logs

**Files to create:**
- `src/hooks/useActivityLog.ts` -- Hook to log actions and fetch logs for an entity

**Files to modify:**
- `src/hooks/useInvoiceStore.ts` -- Log on addInvoice, updateInvoice (status changes), voidInvoice, softDeleteInvoice
- `src/pages/InvoiceView.tsx` -- Add an "Activity" section showing the log timeline below the invoice

---

## Phase G: Customer Statement

### Problem
No way to generate a statement for a customer showing all invoices, payments, and credit notes.

### Changes

**Files to create:**
- `src/pages/CustomerStatement.tsx` -- A page showing:
  - Customer info header
  - Date range filter
  - Table of all invoices, payments, and credit notes for that customer
  - Running balance
  - Export to PDF button

**Files to modify:**
- `src/App.tsx` -- Add route `/customers/:id/statement`
- `src/pages/Customers.tsx` -- Add "View Statement" action in the customer row dropdown

---

## Phase H: Recurring Invoice Auto-Generation

### Problem
Recurring invoices have a schedule but nothing actually generates invoices automatically. The `nextRunDate` is stored but never acted on.

### Changes

**Files to create:**
- `supabase/functions/process-recurring-invoices/index.ts` -- A backend function that:
  - Queries all active recurring invoices where `next_run_date <= today`
  - Creates a new draft invoice for each
  - Updates `next_run_date` to the next cycle date
  - Can be called manually or via a cron trigger

**Files to modify:**
- `src/pages/Invoices.tsx` (RecurringTab) -- Add a "Generate Now" button per recurring invoice for manual triggering

---

## Summary of All New Files

| File | Purpose |
|------|---------|
| `src/hooks/usePayments.ts` | Payment CRUD hook |
| `src/hooks/useActivityLog.ts` | Activity logging hook |
| `src/pages/CustomerStatement.tsx` | Customer statement page |
| `supabase/functions/process-recurring-invoices/index.ts` | Auto-generate recurring invoices |

## Summary of All Modified Files

| File | Changes |
|------|---------|
| `src/types/invoice.ts` | Add `voided`, `partially_paid` to status type |
| `src/hooks/useInvoiceStore.ts` | Add `voidInvoice`, integrate activity logging |
| `src/pages/InvoiceView.tsx` | Void action, record payment dialog, payment history, activity log, restrict delete to drafts |
| `src/pages/Invoices.tsx` | Voided/partially_paid badges, restrict delete to drafts, voided filter |
| `src/components/invoice/InvoiceDocument.tsx` | VOID watermark overlay |
| `src/pages/Quotes.tsx` | Edit draft quotes |
| `src/pages/CreditNotes.tsx` | Status actions, edit drafts, show linked invoice |
| `src/pages/Overview.tsx` | Currency-aware grouping |
| `src/pages/Reports.tsx` | Currency-aware grouping, tax summary |
| `src/pages/Customers.tsx` | "View Statement" action |
| `src/App.tsx` | Add customer statement route |

## Database Migrations

1. Update `soft_delete_invoice` function to reject non-draft invoices
2. Create `payments` table with RLS
3. Create `activity_log` table with RLS
