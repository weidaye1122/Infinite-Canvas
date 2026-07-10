import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import Loader from './Loader';
import { useAuth } from '../contexts/AuthProvider';
import { zhCN } from '../i18n/zhCN';

interface RequireAuthProps {
  children: ReactNode;
}

const RequireAuth = ({ children }: RequireAuthProps) => {
  const location = useLocation();
  const { isLoading, isAuthEnabled, isAuthenticated } = useAuth();

  if (isLoading) {
    return <Loader message={zhCN.auth.checkingStatus} />;
  }

  if (!isAuthEnabled || isAuthenticated) {
    return <>{children}</>;
  }

  const from = `${location.pathname}${location.search}${location.hash}`;

  return <Navigate to="/login" replace state={{ from }} />;
};

export default RequireAuth;
