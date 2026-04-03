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

export const authApi = {
  login: (data: LoginRequest): Promise<AuthResponse> =>
    apiClient.post('/auth/login', data),

  register: (data: RegisterRequest): Promise<AuthResponse> =>
    apiClient.post('/auth/register', data),

  getCurrentUser: (): Promise<User> =>
    apiClient.get('/auth/me'),

  refreshToken: (): Promise<{ token: string }> =>
    apiClient.post('/auth/refresh', {}),

  logout: (): Promise<void> =>
    apiClient.post('/auth/logout', {}),
};
