import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthProvider';
import { zhCN } from '../i18n/zhCN';
import { APP_VERSION_LABEL } from '../constants/app';
import '../styles/LoginPage.scss';

const LoginPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoading, isAuthEnabled, isAuthenticated, login } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTo = useMemo(() => {
    const state = location.state as { from?: string } | null;
    return state?.from || '/';
  }, [location.state]);

  useEffect(() => {
    document.title = `${zhCN.common.appTitle} ${APP_VERSION_LABEL}`;
  }, []);

  if (isLoading) {
    return <div className="login-page login-page--loading">{zhCN.auth.checkingStatus}</div>;
  }

  if (!isAuthEnabled) {
    return <Navigate to="/" replace />;
  }

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!password) {
      setError(zhCN.auth.passwordRequired);
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await login(password);
      navigate(redirectTo, { replace: true });
    } catch (submitError) {
      if (submitError instanceof Error) {
        setError(submitError.message);
      } else {
        setError(zhCN.auth.loginFailed);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1 className="login-card__title">
          <span>{zhCN.common.appTitle}</span>
          <span className="login-card__version">{APP_VERSION_LABEL}</span>
        </h1>
        <p>{zhCN.auth.loginDescription}</p>

        <label htmlFor="login-password">{zhCN.auth.passwordLabel}</label>
        <input
          id="login-password"
          type="password"
          value={password}
          onChange={event => setPassword(event.target.value)}
          placeholder={zhCN.auth.passwordPlaceholder}
          autoComplete="current-password"
        />

        {error ? <div className="login-error">{error}</div> : null}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? zhCN.auth.loggingIn : zhCN.auth.loginButton}
        </button>
      </form>
    </div>
  );
};

export default LoginPage;
