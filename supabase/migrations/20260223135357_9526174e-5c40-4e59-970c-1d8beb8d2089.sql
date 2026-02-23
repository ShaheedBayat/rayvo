
-- Invoice templates table
CREATE TABLE public.invoice_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  currency TEXT NOT NULL DEFAULT 'ZAR',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  tax_rate NUMERIC NOT NULL DEFAULT 15,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.invoice_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own templates" ON public.invoice_templates
FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Users can create templates" ON public.invoice_templates
FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own templates" ON public.invoice_templates
FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can delete own templates" ON public.invoice_templates
FOR DELETE USING (owner_id = auth.uid());

CREATE TRIGGER update_invoice_templates_updated_at
BEFORE UPDATE ON public.invoice_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
