CREATE UNIQUE INDEX IF NOT EXISTS products_company_code_unique
ON public.products (company_id, lower(btrim(code)))
WHERE code IS NOT NULL AND btrim(code) <> '';