import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Company } from '@/types/invoice';

const SUPERUSER_EMAILS = [
  'shaheedbayat1@gmail.com',
  'mo@rayn.co.za',
  'owencrowie@gmail.com',
];

type CompanyRole = 'admin' | 'staff' | 'viewer' | null;

interface ActiveCompanyContextType {
  activeCompany: Company | null;
  activeCompanyId: string | null;
  companies: Company[];
  switchCompany: (id: string) => void;
  refetchCompanies: () => void;
  loading: boolean;
  isSuperAdmin: boolean;
  companyRole: CompanyRole;
  dataReady: boolean;
}

const ActiveCompanyContext = createContext<ActiveCompanyContextType>({
  activeCompany: null,
  activeCompanyId: null,
  companies: [],
  switchCompany: () => {},
  refetchCompanies: () => {},
  loading: true,
  isSuperAdmin: false,
  companyRole: null,
  dataReady: false,
});

function mapCompany(row: any): Company {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone || '',
    address: row.address,
    city: row.city,
    country: row.country,
    taxNumber: row.tax_number || '',
    logo: row.logo || '',
    isVatRegistered: row.is_vat_registered ?? false,
    vatRate: row.vat_rate ?? 15,
    pricingMode: row.pricing_mode || 'exclusive',
  };
}

export function ActiveCompanyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [companyRole, setCompanyRole] = useState<CompanyRole>(null);
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(
    () => localStorage.getItem('activeCompanyId')
  );

  const fetchCompanies = useCallback(async () => {
    if (!user) { setCompanies([]); setLoading(false); return; }

    // Check if super admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_super_admin')
      .eq('user_id', user.id)
      .maybeSingle();

    const superAdmin = profile?.is_super_admin ?? false;
    setIsSuperAdmin(superAdmin);

    // RLS on companies now enforces has_company_access, so a simple select
    // returns only companies the user belongs to (or all for super admins).
    const { data } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false });

    setCompanies((data || []).map(mapCompany));
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  const activeCompany = companies.find(c => c.id === activeCompanyId) || companies[0] || null;

  // Fetch the user's role for the active company
  useEffect(() => {
    if (!user || !activeCompany) { setCompanyRole(null); return; }
    if (isSuperAdmin) { setCompanyRole('admin'); return; }

    supabase
      .from('company_users')
      .select('role')
      .eq('user_id', user.id)
      .eq('company_id', activeCompany.id)
      .maybeSingle()
      .then(({ data }) => {
        setCompanyRole((data?.role as CompanyRole) || null);
      });
  }, [user, activeCompany?.id, isSuperAdmin]);

  // Sync localStorage when activeCompany resolves
  useEffect(() => {
    if (!loading && activeCompany && activeCompanyId !== activeCompany.id) {
      setActiveCompanyId(activeCompany.id);
      localStorage.setItem('activeCompanyId', activeCompany.id);
    }
  }, [loading, activeCompany, activeCompanyId]);

  const switchCompany = (id: string) => {
    if (id !== activeCompanyId) {
      setActiveCompanyId(id);
      localStorage.setItem('activeCompanyId', id);
      navigate('/');
    }
  };

  return (
    <ActiveCompanyContext.Provider value={{
      activeCompany, activeCompanyId, companies, switchCompany,
      refetchCompanies: fetchCompanies, loading, isSuperAdmin, companyRole,
    }}>
      {children}
    </ActiveCompanyContext.Provider>
  );
}

export function useActiveCompany() {
  return useContext(ActiveCompanyContext);
}
