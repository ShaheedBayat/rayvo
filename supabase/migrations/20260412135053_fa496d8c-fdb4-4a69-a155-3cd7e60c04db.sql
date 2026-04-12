ALTER TABLE public.global_settings
ADD COLUMN IF NOT EXISTS late_fee_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS late_fee_type text NOT NULL DEFAULT 'percentage',
ADD COLUMN IF NOT EXISTS late_fee_value numeric NOT NULL DEFAULT 0;