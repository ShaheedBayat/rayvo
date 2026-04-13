import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isPasswordRecovery: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isPasswordRecovery: false,
  signOut: async () => {},
});

const isRecoveryUrl = () => {
  if (typeof window === 'undefined') return false;
  const hash = window.location.hash.toLowerCase();
  const search = window.location.search.toLowerCase();
  return hash.includes('type=recovery') || search.includes('type=recovery');
};

const redirectToResetPassword = () => {
  if (typeof window === 'undefined' || window.location.pathname === '/reset-password' || !isRecoveryUrl()) {
    return;
  }

  const resetUrl = new URL('/reset-password', window.location.origin);
  resetUrl.search = window.location.search;
  resetUrl.hash = window.location.hash;
  window.location.replace(resetUrl.toString());
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(isRecoveryUrl());

  useEffect(() => {
    if (isRecoveryUrl()) {
      setIsPasswordRecovery(true);
      redirectToResetPassword();
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      const recoveryFlow = event === 'PASSWORD_RECOVERY' || isRecoveryUrl();

      if (recoveryFlow) {
        setIsPasswordRecovery(true);
        redirectToResetPassword();
      }

      if (event === 'SIGNED_OUT') {
        setIsPasswordRecovery(false);
      }

      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session: nextSession } }) => {
      if (isRecoveryUrl()) {
        setIsPasswordRecovery(true);
        redirectToResetPassword();
      }

      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    setIsPasswordRecovery(false);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isPasswordRecovery, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
