
-- Add VAT registration fields to companies
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS is_vat_registered boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS vat_rate numeric NOT NULL DEFAULT 15;
