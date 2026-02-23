

# Comprehensive Feature Implementation Plan

This plan provides a single prompt you can paste in default mode to implement all missing features and improvements identified in the audit. Given the scope, it is strongly recommended to break this into multiple phases. Below is the exact prompt text, organized by priority.

---

## Prompt to Paste (Phase 1 - Critical Missing Features)

Copy and paste the following message in a new chat (outside plan mode). This covers the most critical gaps:

---

**Implement the following features one by one, in order. For each feature, make the minimum viable changes needed. Do NOT skip any.**

### 1. Edit Invoice
- Add an "Edit" button to the InvoiceView page (only visible when status is 'draft' or 'approved')
- Clicking it navigates to `/invoices/:id/edit`
- Create an EditInvoice page that reuses the same form layout as CreateInvoice but pre-populates all fields from the existing invoice
- On save, call `updateInvoice` and navigate back to the invoice view
- Add the route to App.tsx

### 2. Customer Selection in Invoice Creation
- On the CreateInvoice page, replace the freeform "Customer Name", "Email", and "Address" fields with a searchable dropdown/combobox that searches existing customers (from useCustomers hook)
- When a customer is selected, auto-fill their name, email, and billing address
- Also auto-fill the customer's sales defaults: default tax rate, default currency, and default due days (calculate due date from today + default_due_days)
- Still allow typing a new customer name if they don't exist yet (combobox pattern)

### 3. Product Selection in Line Items
- In the line items section of CreateInvoice (and EditInvoice), add a searchable product dropdown to each line item row
- When a product is selected from the catalog, auto-fill the description (sell_description), unit price (sell_price), and tax rate (sell_tax_rate)
- Still allow freeform entry if no product is selected
- Use the useProducts hook filtered by activeCompanyId

### 4. Duplicate Invoice
- Add a "Duplicate" option in the InvoiceView dropdown menu
- It should navigate to CreateInvoice but pre-populate all fields (customer, items, currency, tax rate, notes) from the original invoice
- The new invoice gets a fresh ID and auto-generated invoice number

### 5. Confirmation Dialogs
- Add AlertDialog confirmation before deleting an invoice (InvoiceView page)
- Add AlertDialog confirmation before deleting a customer (Customers page)
- Add AlertDialog confirmation before deleting a product (Products page)
- Add AlertDialog confirmation before deleting a recurring invoice

### 6. Discount Support
- Add an optional discount field per line item (percentage or fixed amount)
- Update the invoice type to include `discount` on InvoiceItem
- Update calculateSubtotal to account for discounts
- Show discount column in line items table (CreateInvoice, EditInvoice, InvoiceDocument)
- Add a database migration to ensure the items JSONB can store the discount field

### 7. Payment Terms Display
- Add a "Payment Terms" select on CreateInvoice with options: Due on Receipt, Net 7, Net 14, Net 30, Net 60, Net 90
- When selected, auto-calculate the due date
- Display payment terms on the InvoiceDocument

---

## Prompt to Paste (Phase 2 - Important Features)

Paste this as a separate message after Phase 1 is complete:

---

**Continue implementing these features:**

### 8. Credit Notes (Functional)
- Create a database table `credit_notes` with columns: id, owner_id, company_id, credit_note_number, invoice_id (nullable reference), client_name, client_email, items (jsonb), tax_rate, currency, status (draft/approved/sent), notes, created_at, due_date, deleted_at. Add RLS policies matching invoice patterns.
- Create a DB trigger to auto-generate credit note numbers per company (CN-00001 pattern) using a company_credit_note_counters table
- Build the CreditNotes page with a list view, "New Credit Note" dialog/page
- Allow linking a credit note to an existing invoice (optional)
- Add a useCreditNotes hook following the same pattern as useInvoiceStore

### 9. Reports Dashboard (Functional)
- Replace the placeholder Reports page with actual data visualizations using recharts (already installed)
- Include: Revenue over time (bar chart by month), Invoice status breakdown (pie chart), Top customers by revenue (horizontal bar), Accounts receivable aging (0-30, 31-60, 61-90, 90+ days), Paid vs Outstanding summary cards
- Filter by date range and active company
- All data derived from existing invoices table

### 10. Quotes/Estimates
- Create a `quotes` database table with similar structure to invoices (id, owner_id, company_id, quote_number, client fields, items, tax_rate, currency, status: draft/sent/accepted/declined, valid_until date, notes)
- Auto-generate quote numbers per company (QU-00001)
- Build Quotes page with list, create, and view functionality
- Add "Convert to Invoice" action that creates a new invoice pre-filled from the quote
- Add Quotes to the navigation under SALES
- Add route to App.tsx

### 11. Scope Customers by Company
- Add a `company_id` column to the customers table (nullable, UUID)
- Filter customers by activeCompanyId in useCustomers hook
- Set company_id automatically when creating a new customer
- Update the Customers page to show only customers for the active company

---

## Prompt to Paste (Phase 3 - UI/UX Improvements)

---

**Implement these UI/UX improvements:**

### 12. Pagination
- Add pagination (20 items per page) to the Invoices list, Customers list, and Products list
- Show "Showing X-Y of Z" text and Previous/Next buttons

### 13. Loading States
- Replace plain "Loading..." text with skeleton loaders on Invoices, Customers, Products, and Overview pages
- Use the existing Skeleton component from ui/skeleton

### 14. Date Formatting Consistency
- Create a shared `formatDate` utility function that formats all dates consistently as "DD MMM YYYY" (e.g., "23 Feb 2026") using date-fns
- Apply it across Overview, Invoices, InvoiceView, and InvoiceDocument

### 15. Mobile Responsiveness
- Make the invoice table on the Invoices page stack vertically on mobile (card layout instead of table rows)
- Ensure CreateInvoice form is usable on small screens
- Make the sidebar navigation collapsible on mobile with a hamburger menu

### 16. Empty State Improvements
- When there are no companies yet, show a prominent CTA on the Overview page directing users to create their first company before creating invoices

---

This phased approach ensures each batch is manageable and testable before moving to the next.

