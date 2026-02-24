
-- 1. Expenses table
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  company_id UUID REFERENCES public.companies(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL DEFAULT 'Other',
  description TEXT NOT NULL DEFAULT '',
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'ZAR',
  vendor TEXT NOT NULL DEFAULT '',
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own expenses" ON public.expenses FOR SELECT USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can create expenses" ON public.expenses FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update own expenses" ON public.expenses FOR UPDATE USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can delete own expenses" ON public.expenses FOR DELETE USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Team invites table
CREATE TABLE public.team_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  status TEXT NOT NULL DEFAULT 'pending',
  invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invites" ON public.team_invites FOR SELECT USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can create invites" ON public.team_invites FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update own invites" ON public.team_invites FOR UPDATE USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can delete own invites" ON public.team_invites FOR DELETE USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- 3. Reminder settings table
CREATE TABLE public.reminder_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  days_after_due INTEGER[] NOT NULL DEFAULT '{1,7,14,30}',
  email_template TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.reminder_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reminder settings" ON public.reminder_settings FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Users can create reminder settings" ON public.reminder_settings FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update own reminder settings" ON public.reminder_settings FOR UPDATE USING (owner_id = auth.uid());

CREATE TRIGGER update_reminder_settings_updated_at BEFORE UPDATE ON public.reminder_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Reminder log table
CREATE TABLE public.reminder_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id),
  owner_id UUID NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  days_overdue INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.reminder_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reminder logs" ON public.reminder_log FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Users can create reminder logs" ON public.reminder_log FOR INSERT WITH CHECK (owner_id = auth.uid());

-- 5. Attachments table
CREATE TABLE public.attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own attachments" ON public.attachments FOR SELECT USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can create attachments" ON public.attachments FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can delete own attachments" ON public.attachments FOR DELETE USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Public access for attachments on shared invoices
CREATE POLICY "Public can view attachments for shared invoices" ON public.attachments FOR SELECT USING (
  entity_type = 'invoice' AND entity_id IN (SELECT id FROM public.invoices WHERE share_token IS NOT NULL)
);

-- 6. Add stripe_session_id to payments
ALTER TABLE public.payments ADD COLUMN stripe_session_id TEXT;

-- 7. Storage bucket for attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('attachments', 'attachments', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload attachments" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own attachments files" ON storage.objects FOR SELECT USING (bucket_id = 'attachments');
CREATE POLICY "Users can delete own attachments files" ON storage.objects FOR DELETE USING (bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 8. Enable pg_cron and pg_net for scheduled reminders
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
