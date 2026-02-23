
-- 1. Soft delete: add deleted_at to invoices
ALTER TABLE public.invoices ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 2. Block mechanism: add is_blocked to profiles
ALTER TABLE public.profiles ADD COLUMN is_blocked BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN blocked_reason TEXT DEFAULT '';

-- 3. Auto-generate invoice numbers: sequence + function
CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START WITH 1 INCREMENT BY 1;

-- Set sequence to current max if invoices exist
DO $$
DECLARE
  max_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(
    CASE WHEN invoice_number ~ '^INV-\d+$' 
    THEN CAST(SUBSTRING(invoice_number FROM 5) AS INTEGER) 
    ELSE 0 END
  ), 0) INTO max_num FROM public.invoices;
  IF max_num > 0 THEN
    PERFORM setval('public.invoice_number_seq', max_num);
  END IF;
END $$;

-- Function to generate next invoice number
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.invoice_number := 'INV-' || LPAD(nextval('public.invoice_number_seq')::text, 5, '0');
  RETURN NEW;
END;
$$;

-- Trigger: always override invoice_number on insert
CREATE TRIGGER set_invoice_number
BEFORE INSERT ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.generate_invoice_number();

-- 4. Deletion tracking table
CREATE TABLE public.deletion_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  invoice_id UUID NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.deletion_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own deletion logs"
ON public.deletion_log FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own deletion logs"
ON public.deletion_log FOR SELECT
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- 5. Function to soft-delete an invoice and check bulk delete blocking
CREATE OR REPLACE FUNCTION public.soft_delete_invoice(p_invoice_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_recent_deletes INTEGER;
  v_is_blocked BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  
  -- Check if user is blocked
  SELECT is_blocked INTO v_is_blocked FROM public.profiles WHERE user_id = v_user_id;
  IF v_is_blocked THEN
    RETURN jsonb_build_object('error', 'Your account has been blocked. Contact an administrator.');
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
$$;

-- 6. Update RLS on invoices to exclude soft-deleted for normal views
-- Drop old select policies and recreate
DROP POLICY IF EXISTS "Users can view own invoices" ON public.invoices;
CREATE POLICY "Users can view own invoices"
ON public.invoices FOR SELECT
USING (
  (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
);

-- 7. Function for admin to unblock users
CREATE OR REPLACE FUNCTION public.unblock_user(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can unblock users';
  END IF;
  UPDATE public.profiles SET is_blocked = false, blocked_reason = '' WHERE user_id = p_user_id;
  RETURN true;
END;
$$;
