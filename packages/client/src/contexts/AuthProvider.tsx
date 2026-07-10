import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AuthService, type AuthStatus } from '../services/authService';
import logger from '../utils/logger';
import { zhCN } from '../i18n/zhCN';

interface AuthContextType {
  isLoading: boolean;
  isAuthEnabled: boolean;
  isAuthenticated: boolean;
  login: (password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthEnabled, setIsAuthEnabled] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  const applyStatus = useCallback((status: AuthStatus) => {
    setIsAuthEnabled(status.enabled);
    setIsAuthenticated(status.enabled ? status.authenticated : true);
  }, []);

  const refreshStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const status = await AuthService.getStatus();
      applyStatus(status);
    } catch (error) {
      logger.error(zhCN.errors.checkAuthStatus, error, true);
      setIsAuthEnabled(false);
      setIsAuthenticated(true);
    } finally {
      setIsLoading(false);
    }
  }, [applyStatus]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    const handleUnauthorized = () => {
      setIsAuthEnabled(true);
      setIsAuthenticated(false);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = useCallback(
    async (password: string) => {
      const status = await AuthService.login(password);
      applyStatus(status);
    },
    [applyStatus]
  );

  const logout = useCallback(async () => {
    try {
      await AuthService.logout();
    } finally {
      setIsAuthenticated(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      isLoading,
      isAuthEnabled,
      isAuthenticated,
      login,
      logout,
      refreshStatus,
    }),
    [isLoading, isAuthEnabled, isAuthenticated, login, logout, refreshStatus]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth 必须在 AuthProvider 内使用');
  }

  return context;
};
