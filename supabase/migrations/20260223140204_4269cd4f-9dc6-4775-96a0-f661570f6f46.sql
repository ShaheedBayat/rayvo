
-- Branding themes table with flexible JSONB config
CREATE TABLE public.branding_themes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Default Theme',
  is_default BOOLEAN NOT NULL DEFAULT false,
  
  -- Page & Layout
  page_size TEXT NOT NULL DEFAULT 'A4',
  top_margin NUMERIC NOT NULL DEFAULT 2.0,
  bottom_margin NUMERIC NOT NULL DEFAULT 2.0,
  address_padding NUMERIC NOT NULL DEFAULT 1.0,
  measure_unit TEXT NOT NULL DEFAULT 'cm',
  
  -- Typography
  font_family TEXT NOT NULL DEFAULT 'Inter',
  font_size INTEGER NOT NULL DEFAULT 10,
  primary_color TEXT NOT NULL DEFAULT '#0f766e',
  accent_color TEXT NOT NULL DEFAULT '#14b8a6',
  
  -- Logo
  logo TEXT DEFAULT '',
  logo_alignment TEXT NOT NULL DEFAULT 'left',
  
  -- Company header
  company_header_details TEXT DEFAULT '',
  
  -- Display toggles
  show_logo BOOLEAN NOT NULL DEFAULT true,
  show_tax_number BOOLEAN NOT NULL DEFAULT true,
  show_registered_address BOOLEAN NOT NULL DEFAULT true,
  show_item_code BOOLEAN NOT NULL DEFAULT false,
  show_unit_price_quantity BOOLEAN NOT NULL DEFAULT true,
  show_tax_column BOOLEAN NOT NULL DEFAULT true,
  show_column_headings BOOLEAN NOT NULL DEFAULT true,
  hide_discount BOOLEAN NOT NULL DEFAULT false,
  show_contact_account_number BOOLEAN NOT NULL DEFAULT false,
  
  -- Tax display
  tax_display TEXT NOT NULL DEFAULT 'exclusive',
  tax_subtotal_display TEXT NOT NULL DEFAULT 'single',
  currency_conversion_display TEXT NOT NULL DEFAULT 'single',
  
  -- Payment
  payment_service TEXT NOT NULL DEFAULT 'none',
  
  -- Terms
  terms_invoices TEXT DEFAULT '',
  terms_quotes TEXT DEFAULT '',
  
  -- Document titles (JSONB for flexibility)
  document_titles JSONB NOT NULL DEFAULT '{
    "draft_invoice": "Draft Invoice",
    "approved_invoice": "Tax Invoice",
    "overdue_invoice": "Overdue Invoice",
    "credit_note": "Credit Note",
    "statement": "Statement",
    "quote": "Quote",
    "receipt": "Receipt",
    "remittance_advice": "Remittance Advice"
  }'::jsonb,
  
  -- Advanced
  watermark TEXT DEFAULT '',
  footer_message TEXT DEFAULT '',
  footer_logo TEXT DEFAULT '',
  show_qr_code BOOLEAN NOT NULL DEFAULT false,
  show_bank_details BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.branding_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own themes" ON public.branding_themes
FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Users can create themes" ON public.branding_themes
FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own themes" ON public.branding_themes
FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can delete own themes" ON public.branding_themes
FOR DELETE USING (owner_id = auth.uid());

CREATE TRIGGER update_branding_themes_updated_at
BEFORE UPDATE ON public.branding_themes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
