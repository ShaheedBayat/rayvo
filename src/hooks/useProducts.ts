import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export interface Product {
  id: string;
  companyId: string;
  code: string;
  name: string;
  type: 'service' | 'product';
  isTracked: boolean;
  purchaseEnabled: boolean;
  purchasePrice: number;
  purchaseDescription: string;
  purchaseTaxRate?: number;
  sellEnabled: boolean;
  sellPrice: number;
  sellDescription: string;
  sellTaxRate?: number;
  status: 'active' | 'archived';
  createdAt: string;
}

function mapProduct(row: any): Product {
  return {
    id: row.id,
    companyId: row.company_id || '',
    code: row.code || '',
    name: row.name || '',
    type: row.type as any,
    isTracked: row.is_tracked ?? false,
    purchaseEnabled: row.purchase_enabled ?? true,
    purchasePrice: Number(row.purchase_price) || 0,
    purchaseDescription: row.purchase_description || '',
    purchaseTaxRate: row.purchase_tax_rate != null ? Number(row.purchase_tax_rate) : undefined,
    sellEnabled: row.sell_enabled ?? true,
    sellPrice: Number(row.sell_price) || 0,
    sellDescription: row.sell_description || '',
    sellTaxRate: row.sell_tax_rate != null ? Number(row.sell_tax_rate) : undefined,
    status: row.status || 'active',
    createdAt: row.created_at,
  };
}

export function useProducts() {
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    if (!user) { setProducts([]); setLoading(false); return; }
    let query = supabase.from('products').select('*').order('created_at', { ascending: false });
    if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
    const { data, error } = await query;
    if (!error && data) setProducts(data.map(mapProduct));
    setLoading(false);
  }, [user, activeCompanyId]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const addProduct = useCallback(async (product: Omit<Product, 'id' | 'createdAt'>) => {
    if (!user) return null;
    const { data, error } = await supabase.from('products').insert({
      owner_id: user.id,
      company_id: product.companyId || null,
      code: product.code,
      name: product.name,
      type: product.type,
      is_tracked: product.isTracked,
      purchase_enabled: product.purchaseEnabled,
      purchase_price: product.purchasePrice,
      purchase_description: product.purchaseDescription,
      purchase_tax_rate: product.purchaseTaxRate,
      sell_enabled: product.sellEnabled,
      sell_price: product.sellPrice,
      sell_description: product.sellDescription,
      sell_tax_rate: product.sellTaxRate,
      status: product.status,
    }).select().single();
    if (!error && data) {
      const mapped = mapProduct(data);
      setProducts(prev => [mapped, ...prev]);
      return mapped;
    }
    return null;
  }, [user]);

  const updateProduct = useCallback(async (id: string, updates: Partial<Product>) => {
    const dbUpdates: any = {};
    if (updates.code !== undefined) dbUpdates.code = updates.code;
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.isTracked !== undefined) dbUpdates.is_tracked = updates.isTracked;
    if (updates.purchaseEnabled !== undefined) dbUpdates.purchase_enabled = updates.purchaseEnabled;
    if (updates.purchasePrice !== undefined) dbUpdates.purchase_price = updates.purchasePrice;
    if (updates.purchaseDescription !== undefined) dbUpdates.purchase_description = updates.purchaseDescription;
    if (updates.purchaseTaxRate !== undefined) dbUpdates.purchase_tax_rate = updates.purchaseTaxRate;
    if (updates.sellEnabled !== undefined) dbUpdates.sell_enabled = updates.sellEnabled;
    if (updates.sellPrice !== undefined) dbUpdates.sell_price = updates.sellPrice;
    if (updates.sellDescription !== undefined) dbUpdates.sell_description = updates.sellDescription;
    if (updates.sellTaxRate !== undefined) dbUpdates.sell_tax_rate = updates.sellTaxRate;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.companyId !== undefined) dbUpdates.company_id = updates.companyId || null;
    const { error } = await supabase.from('products').update(dbUpdates).eq('id', id);
    if (!error) setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    return !error;
  }, []);

  const deleteProduct = useCallback(async (id: string) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (!error) setProducts(prev => prev.filter(p => p.id !== id));
    return !error;
  }, []);

  return { products, loading, addProduct, updateProduct, deleteProduct, refetch: fetchProducts };
}
