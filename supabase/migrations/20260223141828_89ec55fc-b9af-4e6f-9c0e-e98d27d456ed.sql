
-- Create products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  code TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'service',
  is_tracked BOOLEAN NOT NULL DEFAULT false,
  purchase_enabled BOOLEAN NOT NULL DEFAULT true,
  purchase_price NUMERIC NOT NULL DEFAULT 0,
  purchase_description TEXT NOT NULL DEFAULT '',
  purchase_tax_rate NUMERIC NOT NULL DEFAULT 15,
  sell_enabled BOOLEAN NOT NULL DEFAULT true,
  sell_price NUMERIC NOT NULL DEFAULT 0,
  sell_description TEXT NOT NULL DEFAULT '',
  sell_tax_rate NUMERIC NOT NULL DEFAULT 15,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own products" ON public.products FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Users can create products" ON public.products FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update own products" ON public.products FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users can delete own products" ON public.products FOR DELETE USING (owner_id = auth.uid());

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
