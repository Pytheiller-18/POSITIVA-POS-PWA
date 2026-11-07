import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../services/api.ts';
import { DEMO_TENANT_ID } from '../services/db.ts';
import type { Tenant, User } from '../types/pos.ts';

const DEMO_USER: User = {
  id: 'demo-user-admin',
  tenant_id: DEMO_TENANT_ID,
  full_name: 'Administrador Local',
  email: 'admin@pos.com',
  role: 'ADMIN',
};

const DEMO_TENANT: Tenant = {
  id: DEMO_TENANT_ID,
  business_name: 'Positiva-POS (Tienda Local)',
  tax_id: 'NIT 900.123.456-7',
  currency_symbol: '$',
};

export function useAuth() {
  const [user, setUser] = useState<User>(() => apiClient.user || DEMO_USER);
  const [tenant, setTenant] = useState<Tenant>(() => apiClient.tenant || DEMO_TENANT);
  const [isCloudAuthenticated, setIsCloudAuthenticated] = useState<boolean>(() =>
    apiClient.isAuthenticated()
  );

  const logout = useCallback(() => {
    apiClient.clearSession();
    setUser(DEMO_USER);
    setTenant(DEMO_TENANT);
    setIsCloudAuthenticated(false);
  }, []);

  useEffect(() => {
    const handleExpired = () => logout();
    window.addEventListener('positiva-auth-expired', handleExpired);
    return () => window.removeEventListener('positiva-auth-expired', handleExpired);
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiClient.login(email, password);
    setUser(res.user);
    setTenant(res.tenant);
    setIsCloudAuthenticated(true);
    return res;
  }, []);

  return {
    user,
    tenant,
    isCloudAuthenticated,
    login,
    logout,
  };
}

