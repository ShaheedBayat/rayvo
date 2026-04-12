ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS default_currency text NOT NULL DEFAULT 'ZAR';