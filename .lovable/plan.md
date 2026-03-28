

# Generate ChatGPT Context Prompt for RayVo Project

## What this does
Creates a comprehensive text document that captures every aspect of the RayVo invoicing application — architecture, database schema, business logic, RBAC, edge functions, UI structure, and design decisions — so ChatGPT can serve as a "second brain" for the project.

## Deliverable
A markdown file at `/mnt/documents/rayvo-chatgpt-context.md` containing:

1. **Project Overview** — App name, tech stack (React + Vite + TypeScript + Tailwind + Supabase), purpose (South African invoicing SaaS)

2. **Complete Database Schema** — All 20+ tables with columns, types, defaults, RLS policies, and relationships

3. **Database Functions & Triggers** — `generate_invoice_number()`, `generate_quote_number()`, `generate_credit_note_number()`, `has_role()`, `handle_new_user()`, `soft_delete_invoice()`, `unblock_user()`, `update_updated_at_column()`

4. **Authentication & RBAC** — Three roles (admin/staff/viewer), permission matrix, `usePermissions` hook logic, default role assignment on signup

5. **Core Business Logic**:
   - Invoice lifecycle (draft → approved → sent → paid/voided)
   - Smart totals calculation (`calculateSmartTotals`) with VAT inclusive/exclusive modes
   - Invoice numbering (company-scoped counters, INV-00001 format)
   - Soft deletion with rate-limiting (3 deletes in 5 min = account block)
   - Payment tracking with overpayment warnings and status auto-recalculation

6. **Recurring Invoices** — Template-only model, edge function generation, next_run_date calculation, duplicate prevention

7. **Edge Functions** — All 6 functions with their full logic: `process-recurring-invoices`, `send-invoice-email`, `send-overdue-reminders`, `invite-team-member`, `payfast-checkout`, `payfast-notify`

8. **Frontend Architecture**:
   - All routes and page components
   - AppLayout with collapsible sidebar, mobile drawer, company switcher
   - Key hooks: `useAuth`, `useActiveCompany`, `useInvoices`, `useCustomers`, `useProducts`, `usePayments`, `useExpenses`, `useRecurringInvoices`, `useTaxRates`, `usePermissions`, `useGlobalSettings`, `useTeam`, `useReminderSettings`, `useBrandingThemes`, `useCreditNotes`, `useQuotes`, `useVatLedger`, `useAttachments`

9. **VAT System** — Registration toggle, inclusive/exclusive pricing, per-line tax rates, VAT ledger entries, VAT report page

10. **Features Inventory** — Customers (with contacts, billing/delivery addresses), Products & Services, Quotes, Credit Notes, Expenses with categories, Customer Statements, Branding Themes, File Attachments, Online Payments (PayFast), Team Invites, Overdue Reminders, Reports (P&L, cash flow, CSV export)

11. **Type Definitions** — Complete `Invoice`, `Company`, `InvoiceItem`, `Currency` types

12. **Secrets & Configuration** — Available secrets (RESEND_API_KEY, etc.), storage buckets (attachments), Supabase config

## Technical approach
- Read remaining key files to capture all details
- Compile into a single structured markdown document
- Write to `/mnt/documents/rayvo-chatgpt-context.md`

