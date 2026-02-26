import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompanies } from '@/hooks/useInvoiceStore';
import type { Company } from '@/types/invoice';

interface ActiveCompanyContextType {
  activeCompany: Company | null;
  activeCompanyId: string | null;
  companies: Company[];
  switchCompany: (id: string) => void;
  refetchCompanies: () => void;
  loading: boolean;
}

const ActiveCompanyContext = createContext<ActiveCompanyContextType>({
  activeCompany: null,
  activeCompanyId: null,
  companies: [],
  switchCompany: () => {},
  refetchCompanies: () => {},
  loading: true,
});

export function ActiveCompanyProvider({ children }: { children: ReactNode }) {
  const { companies, loading, refetch } = useCompanies();
  const navigate = useNavigate();
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(
    () => localStorage.getItem('activeCompanyId')
  );

  const activeCompany = companies.find(c => c.id === activeCompanyId) || companies[0] || null;

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
    <ActiveCompanyContext.Provider value={{ activeCompany, activeCompanyId, companies, switchCompany, refetchCompanies: refetch, loading }}>
      {children}
    </ActiveCompanyContext.Provider>
  );
}

export function useActiveCompany() {
  return useContext(ActiveCompanyContext);
}
