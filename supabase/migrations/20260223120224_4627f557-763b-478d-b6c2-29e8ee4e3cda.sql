
-- Create customers table with Individual/Company types
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'individual' CHECK (type IN ('individual', 'company')),
  name TEXT NOT NULL,
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  city TEXT DEFAULT '',
  country TEXT DEFAULT '',
  -- Individual fields
  id_number TEXT DEFAULT '',
  -- Company fields
  registration_number TEXT DEFAULT '',
  vat_number TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own customers"
ON public.customers FOR SELECT
USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create customers"
ON public.customers FOR INSERT
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own customers"
ON public.customers FOR UPDATE
USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete own customers"
ON public.customers FOR DELETE
USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
