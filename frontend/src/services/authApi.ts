import { apiClient } from './api';
import type { User } from '@/types';

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

interface AuthResponse {
  user: User;
  token: string;
}

interface BackendAuthData {
  access_token: string;
  token_type: string;
  user: User;
}

interface BackendAuthResponse {
  success: boolean;
  data: BackendAuthData;
  meta: unknown;
  error: unknown;
}

interface BackendUserResponse {
  success: boolean;
  data: User;
  meta: unknown;
  error: unknown;
}

interface BackendRefreshResponse {
  success: boolean;
  data: { access_token: string; token_type: string };
  meta: unknown;
  error: unknown;
}

function parseAuthResponse(res: BackendAuthResponse): AuthResponse {
  return {
    user: res.data.user,
    token: res.data.access_token,
  };
}

export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const res = await apiClient.post<BackendAuthResponse>('/auth/login', data);
    return parseAuthResponse(res);
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const res = await apiClient.post<BackendAuthResponse>('/auth/register', data);
    return parseAuthResponse(res);
  },

  getCurrentUser: async (): Promise<User> => {
    const res = await apiClient.get<BackendUserResponse>('/auth/me');
    return res.data;
  },

  refreshToken: async (): Promise<{ token: string }> => {
    const res = await apiClient.post<BackendRefreshResponse>('/auth/refresh', {});
    return { token: res.data.access_token };
  },

  logout: (): Promise<void> =>
    apiClient.post('/auth/logout', {}),
};
