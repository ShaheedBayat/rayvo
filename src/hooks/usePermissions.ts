import { useMemo } from 'react';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export type CompanyRole = 'admin' | 'staff' | 'viewer';

export interface Permissions {
  role: CompanyRole;
  loading: boolean;
  isSuperAdmin: boolean;

  // Invoices
  canCreateInvoice: boolean;
  canEditInvoice: (status: string) => boolean;
  canDeleteInvoice: boolean;
  canVoidInvoice: boolean;
  canRecordPayment: boolean;

  // Recurring
  canManageRecurring: boolean;

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

  // Expenses
  canCreateExpense: boolean;
  canEditExpense: boolean;
  canDeleteExpense: boolean;
}

export function usePermissions(): Permissions {
  const { companyRole, loading, isSuperAdmin } = useActiveCompany();

  const role: CompanyRole = (companyRole as CompanyRole) || 'viewer';

  const isAdmin = isSuperAdmin || role === 'admin';
  const isStaff = role === 'staff';

  return useMemo(() => ({
    role,
    loading,
    isSuperAdmin,

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
    canDeleteCustomer: isAdmin,
    canCreateProduct: isAdmin || isStaff,
    canEditProduct: isAdmin || isStaff,
    canDeleteProduct: isAdmin,

    // Settings & Users
    canAccessSettings: isAdmin,
    canManageUsers: isAdmin,
    canChangeVat: isAdmin,

    // Reports
    canViewReports: true,

    // Companies — only super admins can manage all companies
    canManageCompanies: isSuperAdmin || isAdmin,

    // Expenses
    canCreateExpense: isAdmin || isStaff,
    canEditExpense: isAdmin || isStaff,
    canDeleteExpense: isAdmin,
  }), [role, loading, isSuperAdmin, isAdmin, isStaff]);
}
