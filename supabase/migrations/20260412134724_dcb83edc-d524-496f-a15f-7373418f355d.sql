CREATE POLICY "Public can view payments for shared invoices"
ON public.payments
FOR SELECT
TO anon
USING (
  invoice_id IN (
    SELECT id FROM public.invoices WHERE share_token IS NOT NULL
  )
);