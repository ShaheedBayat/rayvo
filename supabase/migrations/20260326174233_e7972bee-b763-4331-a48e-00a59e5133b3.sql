
-- Delete payments linked to invoices
DELETE FROM public.payments;

-- Delete VAT ledger entries
DELETE FROM public.vat_ledger_entries;

-- Delete activity log entries
DELETE FROM public.activity_log;

-- Delete attachments
DELETE FROM public.attachments;

-- Delete reminder logs
DELETE FROM public.reminder_log;

-- Delete all invoices
DELETE FROM public.invoices;

-- Delete all credit notes
DELETE FROM public.credit_notes;

-- Delete all quotes
DELETE FROM public.quotes;

-- Delete all recurring invoices
DELETE FROM public.recurring_invoices;

-- Delete customer contacts
DELETE FROM public.customer_contacts;

-- Delete all customers
DELETE FROM public.customers;

-- Delete companies except Zensure
DELETE FROM public.companies WHERE id != '85b000f1-ae7f-412d-8b59-17d27edb5304';

-- Reset invoice counters for remaining company
DELETE FROM public.company_invoice_counters;
DELETE FROM public.company_quote_counters;
DELETE FROM public.company_credit_note_counters;
