import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, type Principal } from './api';

interface AuthContextValue {
  principal: Principal | null;
  loading: boolean;
  login(email: string, password: string): Promise<Principal>;
  logout(): Promise<void>;
  refresh(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [principal, setPrincipal] = useState<Principal | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      const result = await api.me();
      setPrincipal(result.principal);
    } catch {
      setPrincipal(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    principal,
    loading,
    async login(email, password) {
      const result = await api.login(email, password);
      setPrincipal(result.principal);
      return result.principal;
    },
    async logout() {
      try {
        await api.logout();
      } finally {
        setPrincipal(null);
      }
    },
    refresh,
  }), [principal, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
