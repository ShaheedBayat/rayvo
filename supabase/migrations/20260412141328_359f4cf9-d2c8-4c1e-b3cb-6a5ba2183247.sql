
CREATE TABLE public.email_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  template_type text NOT NULL DEFAULT 'invoice',
  subject text NOT NULL DEFAULT 'Invoice {{invoice_number}} from {{company_name}}',
  body text NOT NULL DEFAULT 'Hi {{client_name}},

Please find attached invoice {{invoice_number}} for {{total_amount}}.

Due date: {{due_date}}

Thank you for your business.

Best regards,
{{company_name}}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner_id, company_id, template_type)
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own email templates"
  ON public.email_templates FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create own email templates"
  ON public.email_templates FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own email templates"
  ON public.email_templates FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own email templates"
  ON public.email_templates FOR DELETE
  USING (auth.uid() = owner_id);

CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
