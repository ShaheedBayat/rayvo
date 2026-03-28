import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type AppRole = 'admin' | 'staff' | 'viewer';

export interface Permissions {
  role: AppRole;
  loading: boolean;

  // Invoices
  canCreateInvoice: boolean;
  canEditInvoice: (status: string) => boolean;
  canDeleteInvoice: boolean;
  canVoidInvoice: boolean;
  canRecordPayment: boolean;

  // Recurring
  canManageRecurring: boolean; // create/edit/delete/generate

  // Customers & Products
  canCreateCustomer: boolean;
  canEditCustomer: boolean;
  canDeleteCustomer: boolean;
  canCreateProduct: boolean;
  canEditProduct: boolean;
  canDeleteProduct: boolean;

  // Settings & Users
  canAccessSettings: boolean;
  canManageUsers: boolean;
  canChangeVat: boolean;

  // Reports
  canViewReports: boolean;

  // Companies
  canManageCompanies: boolean;
}

export function usePermissions(): Permissions {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole>('viewer');
  const [loading, setLoading] = useState(true);

  const fetchRole = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();
    if (data) {
      setRole(data.role as AppRole);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchRole(); }, [fetchRole]);

  const isAdmin = role === 'admin';
  const isStaff = role === 'staff';
  const isViewer = role === 'viewer';

  return useMemo(() => ({
    role,
    loading,

    // Invoices
    canCreateInvoice: isAdmin || isStaff,
    canEditInvoice: (status: string) => {
      if (status === 'paid' || status === 'voided') return false;
      if (status === 'partially_paid') return false;
      if (isAdmin) return status === 'draft' || status === 'approved' || status === 'sent';
      if (isStaff) return status === 'draft';
      return false;
    },
    canDeleteInvoice: isAdmin,
    canVoidInvoice: isAdmin,
    canRecordPayment: isAdmin || isStaff,

    // Recurring
    canManageRecurring: isAdmin,

    // Customers & Products
    canCreateCustomer: isAdmin || isStaff,
    canEditCustomer: isAdmin || isStaff,
    canDeleteCustomer: isAdmin || isStaff,
    canCreateProduct: isAdmin || isStaff,
    canEditProduct: isAdmin || isStaff,
    canDeleteProduct: isAdmin || isStaff,

    // Settings & Users
    canAccessSettings: isAdmin,
    canManageUsers: isAdmin,
    canChangeVat: isAdmin,

    // Reports
    canViewReports: true, // all roles can view

    // Companies
    canManageCompanies: isAdmin,
  }), [role, loading, isAdmin, isStaff, isViewer]);
}
