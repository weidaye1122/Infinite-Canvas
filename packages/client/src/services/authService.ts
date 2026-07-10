import { api } from './api';

export interface AuthStatus {
  enabled: boolean;
  authenticated: boolean;
}

export const AuthService = {
  getStatus: () => api.get<AuthStatus>('/auth/status'),
  login: (password: string) => api.post<AuthStatus>('/auth/login', { password }),
  logout: () => api.post<AuthStatus>('/auth/logout'),
};
