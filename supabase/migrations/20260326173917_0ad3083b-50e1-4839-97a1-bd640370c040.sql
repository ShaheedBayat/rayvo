
CREATE TRIGGER trg_generate_invoice_number
  BEFORE INSERT ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_invoice_number();
