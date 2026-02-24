
# RayVo: 7 Major Feature Additions

This plan covers all 7 features you requested, built in a single implementation pass.

---

## 1. Email Delivery (Send Invoices from RayVo)

**What you get:** A "Send Invoice" button on the invoice view page that sends a professional email with the invoice summary and a link to the public invoice page. Supports sending to multiple email addresses.

**How it works:**
- Set up Resend as the email service (requires a free Resend account and API key)
- Create a backend function `send-invoice-email` that accepts invoice data + recipient emails and sends a styled HTML email
- Add a "Send Invoice" dialog on the InvoiceView page with a multi-email input field (comma-separated or tag-style)
- Email includes: invoice number, amount, due date, company name, and a "View Invoice" button linking to the public invoice page
- Auto-generates the share token if not already set
- Logs the send action in the activity log

**Files:**
- `supabase/functions/send-invoice-email/index.ts` (new)
- `src/pages/InvoiceView.tsx` (add Send dialog)
- `supabase/config.toml` (register function)

---

## 2. Stripe Payment Integration

**What you get:** Clients can pay invoices online via Stripe from the public invoice page. Payments auto-update invoice status.

**How it works:**
- Enable Stripe via the Lovable Stripe integration
- Create a backend function `create-checkout-session` that creates a Stripe Checkout session for an invoice
- Create a backend function `stripe-webhook` to listen for `checkout.session.completed` events and auto-record payments + update invoice status
- Add a "Pay Now" button on the public invoice page (`PublicInvoice.tsx`)
- Store Stripe session ID on the payment record for reconciliation
- Update the OnlinePayments settings page to show Stripe as connected

**Files:**
- `supabase/functions/create-checkout-session/index.ts` (new)
- `supabase/functions/stripe-webhook/index.ts` (new)
- `src/pages/PublicInvoice.tsx` (add Pay Now button)
- `src/pages/OnlinePayments.tsx` (update connected status)
- `supabase/config.toml` (register functions)
- DB migration: add `stripe_session_id` column to `payments` table

---

## 3. Expense Tracking + Profit & Loss

**What you get:** A full expense tracking module with categories, and a Profit & Loss report combining income from invoices with recorded expenses.

**How it works:**
- New `expenses` table with columns: id, owner_id, company_id, date, category, description, amount, currency, vendor, reference, notes, created_at
- New Expenses page with CRUD (add/edit/delete expenses, filter by date/category)
- Categories: Rent, Utilities, Salaries, Office Supplies, Travel, Marketing, Software, Insurance, Professional Services, Other
- New Profit & Loss section in Reports page showing: Total Income (paid invoices), Total Expenses, Net Profit/Loss, broken down by month
- Sidebar gets an "Expenses" link under Sales

**Files:**
- DB migration: create `expenses` table with RLS policies
- `src/hooks/useExpenses.ts` (new)
- `src/pages/Expenses.tsx` (new)
- `src/pages/Reports.tsx` (add P&L section)
- `src/components/AppLayout.tsx` (add sidebar link)
- `src/App.tsx` (add route)

---

## 4. Multi-User Team Access (Full Invite System)

**What you get:** Invite team members by email, assign roles (Owner, Admin, Finance, Viewer), manage team from Settings.

**How it works:**
- New `team_invites` table: id, owner_id, email, role, status (pending/accepted/declined), invited_at, accepted_at
- Backend function `invite-team-member` that creates the invite and sends an email via Resend
- When an invited user signs up and logs in, a trigger checks for pending invites matching their email and assigns the role
- New "Team" section in Settings page showing current team members (from user_roles + profiles) and pending invites
- Role-based UI restrictions: Viewers see read-only views, Finance can manage invoices/payments but not settings, Admin has full access
- Uses the existing `user_roles` table and `has_role()` function

**Files:**
- DB migration: create `team_invites` table with RLS, create trigger for auto-accepting invites on signup
- `supabase/functions/invite-team-member/index.ts` (new)
- `src/hooks/useTeam.ts` (new)
- `src/pages/SettingsPage.tsx` (add Team section)
- `src/components/AppLayout.tsx` (role-based nav visibility)
- `supabase/config.toml` (register function)

---

## 5. Automated Overdue Reminders

**What you get:** Automatic email reminders sent to clients when invoices are past due.

**How it works:**
- New `reminder_settings` table: id, owner_id, enabled, days_after_due (array of days, e.g. [1, 7, 14, 30]), email_template
- New `reminder_log` table: id, invoice_id, sent_at, days_overdue
- Backend function `send-overdue-reminders` that checks for overdue invoices and sends reminder emails via Resend (respecting the schedule and avoiding duplicates)
- Scheduled via pg_cron to run daily
- Settings UI in the Settings page to configure reminder schedule and toggle on/off
- Each reminder logs to `reminder_log` and `activity_log`

**Files:**
- DB migration: create `reminder_settings` and `reminder_log` tables with RLS
- `supabase/functions/send-overdue-reminders/index.ts` (new)
- `src/hooks/useReminderSettings.ts` (new)
- `src/pages/SettingsPage.tsx` (add Reminders section)
- `supabase/config.toml` (register function)
- SQL insert (via insert tool): pg_cron job to run daily

---

## 6. Enhanced Reporting (P&L, Cash Flow, CSV/Excel Export)

**What you get:** Profit & Loss report, cash flow summary, and CSV export for all report data.

**How it works:**
- P&L report (covered in Feature 3 above -- uses expense + invoice data)
- Cash flow section: shows cash inflows (payments received) vs outflows (expenses) by month
- CSV export button on every report section that downloads the data as a .csv file
- Export function built client-side (no backend needed): converts the report data arrays to CSV format and triggers a download
- Add an "Export" dropdown to the Reports page header with options: Export Invoices, Export Payments, Export Expenses, Export P&L

**Files:**
- `src/lib/exportCsv.ts` (new utility)
- `src/pages/Reports.tsx` (add P&L, cash flow, export buttons)

---

## 7. Receipt/Document Attachments

**What you get:** Attach files (PDFs, images) to invoices and expenses.

**How it works:**
- Create a storage bucket `attachments` for file uploads
- New `attachments` table: id, owner_id, entity_type (invoice/expense), entity_id, file_name, file_path, file_size, mime_type, created_at
- File upload component that allows drag-and-drop or click-to-upload
- Attachments section on InvoiceView page and Expense edit dialog
- Files stored in the `attachments` bucket, with public read access for shared invoices
- Max file size: 10MB per file

**Files:**
- DB migration: create `attachments` table with RLS, create storage bucket with policies
- `src/hooks/useAttachments.ts` (new)
- `src/components/FileUpload.tsx` (new reusable component)
- `src/pages/InvoiceView.tsx` (add Attachments section)
- `src/pages/Expenses.tsx` (add attachment support)

---

## Prerequisites Before Implementation

1. **Resend API Key** -- You'll need to create a free account at resend.com, verify your email domain, and provide your API key. This powers Features 1, 4, and 5 (email delivery, team invites, overdue reminders).

2. **Stripe Integration** -- You'll need to enable Stripe through Lovable and provide your Stripe secret key. This powers Feature 2 (online payments).

3. **pg_cron Extension** -- Needs to be enabled for the daily overdue reminder schedule (Feature 5).

---

## Implementation Order

Since these features have some dependencies, they'll be built in this sequence:

1. Database migrations (all tables + storage bucket at once)
2. Email delivery (Resend setup + send-invoice-email function)
3. Expense tracking (table + CRUD + hook + page)
4. Enhanced reporting (P&L, cash flow, CSV export)
5. Document attachments (storage + upload component + integration)
6. Team access (invites table + function + settings UI)
7. Overdue reminders (settings + function + cron)
8. Stripe payments (checkout + webhook + public invoice button)

---

## Summary of New Database Tables

| Table | Purpose |
|-------|---------|
| `expenses` | Track business expenses with categories |
| `team_invites` | Pending team member invitations |
| `reminder_settings` | Per-user overdue reminder configuration |
| `reminder_log` | Track which reminders were sent |
| `attachments` | File attachment metadata for invoices/expenses |

## Summary of New Backend Functions

| Function | Purpose |
|----------|---------|
| `send-invoice-email` | Send invoice emails to clients |
| `create-checkout-session` | Create Stripe checkout for invoice payment |
| `stripe-webhook` | Handle Stripe payment confirmations |
| `invite-team-member` | Send team invite emails |
| `send-overdue-reminders` | Daily cron job for overdue reminders |

## Summary of New Pages/Components

| File | Purpose |
|------|---------|
| `src/pages/Expenses.tsx` | Expense tracking CRUD page |
| `src/components/FileUpload.tsx` | Reusable file upload component |
| `src/lib/exportCsv.ts` | CSV export utility |

