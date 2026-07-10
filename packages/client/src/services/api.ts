import { zhCN } from '../i18n/zhCN';

const API_BASE_URL = '/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

type RequestBody = Record<string, unknown> | unknown[];

const emitUnauthorized = () => {
  window.dispatchEvent(new CustomEvent('auth:unauthorized'));
};

const parseResponse = async <T>(response: Response): Promise<ApiResponse<T>> => {
  try {
    return (await response.json()) as ApiResponse<T>;
  } catch {
    return { success: response.ok };
  }
};

const request = async <T>(endpoint: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    credentials: 'include',
    ...init,
  });

  const data = await parseResponse<T>(response);

  if (response.status === 401) {
    emitUnauthorized();
    throw new Error(data.message || zhCN.errors.unauthorized);
  }

  if (!response.ok || data.success === false) {
    throw new Error(data.message || zhCN.errors.requestFailedWithStatus(response.status));
  }

  return (data.data ?? data) as T;
};

export const api = {
  async get<T>(endpoint: string): Promise<T> {
    return request<T>(endpoint);
  },

  async post<T>(endpoint: string, body?: RequestBody): Promise<T> {
    return request<T>(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  },

  async put<T>(endpoint: string, body: RequestBody): Promise<T> {
    return request<T>(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  },

  async patch<T>(endpoint: string, body: RequestBody): Promise<T> {
    return request<T>(endpoint, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  },

  async delete(endpoint: string): Promise<void> {
    await request<void>(endpoint, {
      method: 'DELETE',
    });
  },
};
