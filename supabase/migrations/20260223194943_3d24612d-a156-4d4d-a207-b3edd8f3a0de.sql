
-- 1. Update soft_delete_invoice to reject non-draft invoices
CREATE OR REPLACE FUNCTION public.soft_delete_invoice(p_invoice_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_recent_deletes INTEGER;
  v_is_blocked BOOLEAN;
  v_status TEXT;
BEGIN
  v_user_id := auth.uid();
  
  -- Check if user is blocked
  SELECT is_blocked INTO v_is_blocked FROM public.profiles WHERE user_id = v_user_id;
  IF v_is_blocked THEN
    RETURN jsonb_build_object('error', 'Your account has been blocked. Contact an administrator.');
  END IF;

  -- Check invoice status - only draft invoices can be deleted
  SELECT status INTO v_status FROM public.invoices WHERE id = p_invoice_id AND owner_id = v_user_id;
  IF v_status IS NULL THEN
    RETURN jsonb_build_object('error', 'Invoice not found.');
  END IF;
  IF v_status != 'draft' THEN
    RETURN jsonb_build_object('error', 'Only draft invoices can be deleted. Use void for approved/sent invoices.');
  END IF;

  -- Soft delete the invoice
  UPDATE public.invoices SET deleted_at = now() WHERE id = p_invoice_id AND owner_id = v_user_id AND deleted_at IS NULL;

  -- Log deletion
  INSERT INTO public.deletion_log (user_id, invoice_id) VALUES (v_user_id, p_invoice_id);

  -- Count recent deletions in last 5 minutes
  SELECT COUNT(*) INTO v_recent_deletes
  FROM public.deletion_log
  WHERE user_id = v_user_id AND deleted_at > now() - interval '5 minutes';

  -- Block if 3+ deletions
  IF v_recent_deletes >= 3 THEN
    UPDATE public.profiles SET is_blocked = true, blocked_reason = 'Bulk deletion detected: ' || v_recent_deletes || ' invoices deleted within 5 minutes' WHERE user_id = v_user_id;
    RETURN jsonb_build_object('blocked', true, 'message', 'Your account has been blocked due to bulk deletion. Contact an administrator.');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$function$;

-- 2. Create payments table
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id),
  amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  method TEXT NOT NULL DEFAULT 'bank_transfer',
  reference TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Users can create payments" ON public.payments FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update own payments" ON public.payments FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users can delete own payments" ON public.payments FOR DELETE USING (owner_id = auth.uid());

-- 3. Create activity_log table
CREATE TABLE public.activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  details TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity" ON public.activity_log FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Users can create activity" ON public.activity_log FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE INDEX idx_activity_log_entity ON public.activity_log (entity_type, entity_id);
CREATE INDEX idx_payments_invoice ON public.payments (invoice_id);
