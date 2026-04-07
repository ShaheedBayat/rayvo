import { useMemo, useState, useEffect } from 'react';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export type CompanyRole = 'admin' | 'staff' | 'viewer';

export interface Permissions {
  role: CompanyRole;
  loading: boolean;
  isSuperAdmin: boolean;

  canCreateInvoice: boolean;
  canEditInvoice: (status: string) => boolean;
  canDeleteInvoice: boolean;
  canVoidInvoice: boolean;
  canSendInvoice: boolean;
  canRecordPayment: boolean;

  canManageRecurring: boolean;

  canCreateCustomer: boolean;
  canEditCustomer: boolean;
  canDeleteCustomer: boolean;
  canCreateProduct: boolean;
  canEditProduct: boolean;
  canDeleteProduct: boolean;

  canAccessSettings: boolean;
  canManageUsers: boolean;
  canChangeVat: boolean;

  canViewReports: boolean;

  canManageCompanies: boolean;

  canCreateExpense: boolean;
  canEditExpense: boolean;
  canDeleteExpense: boolean;
}

export function usePermissions(): Permissions {
  const { companyRole, loading, isSuperAdmin, activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!user?.id || !activeCompanyId) {
      setOverrides({});
      return;
    }
    const fetchOverrides = async () => {
      const { data } = await supabase
        .from('user_permission_overrides' as any)
        .select('permission_key, value')
        .eq('user_id', user.id)
        .eq('company_id', activeCompanyId);
      if (data) {
        const map: Record<string, boolean> = {};
        (data as any[]).forEach((r: any) => { map[r.permission_key] = r.value; });
        setOverrides(map);
      }
    };
    fetchOverrides();
  }, [user?.id, activeCompanyId]);

  const role: CompanyRole = (companyRole as CompanyRole) || 'viewer';
  const isAdmin = isSuperAdmin || role === 'admin';
  const isStaff = role === 'staff';

  const override = (key: string, defaultValue: boolean) =>
    key in overrides ? overrides[key] : defaultValue;

  return useMemo(() => ({
    role,
    loading,
    isSuperAdmin,

    canCreateInvoice: override('canCreateInvoice', isAdmin || isStaff),
    canEditInvoice: (status: string) => {
      if (status === 'paid' || status === 'voided') return false;
      if (status === 'partially_paid') return false;
      if (isAdmin) return override('canEditInvoice_' + status, status === 'draft' || status === 'approved' || status === 'sent');
      if (isStaff) return override('canEditInvoice_' + status, status === 'draft');
      return false;
    },
    canDeleteInvoice: override('canDeleteInvoice', isAdmin),
    canVoidInvoice: override('canVoidInvoice', isAdmin),
    canSendInvoice: override('canSendInvoice', isAdmin),
    canRecordPayment: override('canRecordPayment', isAdmin || isStaff),

    canManageRecurring: override('canManageRecurring', isAdmin),

    canCreateCustomer: override('canCreateCustomer', isAdmin || isStaff),
    canEditCustomer: override('canEditCustomer', isAdmin || isStaff),
    canDeleteCustomer: override('canDeleteCustomer', isAdmin),
    canCreateProduct: override('canCreateProduct', isAdmin || isStaff),
    canEditProduct: override('canEditProduct', isAdmin || isStaff),
    canDeleteProduct: override('canDeleteProduct', isAdmin),

    canAccessSettings: override('canAccessSettings', isAdmin),
    canManageUsers: override('canManageUsers', isAdmin),
    canChangeVat: override('canChangeVat', isAdmin),

    canViewReports: override('canViewReports', true),

    canManageCompanies: override('canManageCompanies', isSuperAdmin || isAdmin),

    canCreateExpense: override('canCreateExpense', isAdmin || isStaff),
    canEditExpense: override('canEditExpense', isAdmin || isStaff),
    canDeleteExpense: override('canDeleteExpense', isAdmin),
  }), [role, loading, isSuperAdmin, isAdmin, isStaff, overrides]);
}
