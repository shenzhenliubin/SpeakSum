import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { authApi } from '@/services/authApi';
import type { User } from '@/types';

interface AuthState {
  // State
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  refreshToken: () => Promise<void>;
  setTestToken: (token: string) => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  subscribeWithSelector(
    immer(
      persist(
        (set, get) => ({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: true,

          login: async (email: string, password: string) => {
            const { user, token } = await authApi.login({ email, password });
            set((state) => {
              state.user = user;
              state.token = token;
              state.isAuthenticated = true;
            });
          },

          register: async (email: string, password: string, name: string) => {
            const { user, token } = await authApi.register({ email, password, name });
            set((state) => {
              state.user = user;
              state.token = token;
              state.isAuthenticated = true;
            });
          },

          logout: () => {
            set((state) => {
              state.user = null;
              state.token = null;
              state.isAuthenticated = false;
            });
            localStorage.removeItem('speaksum-auth');
          },

          checkAuth: async () => {
            const token = get().token;
            if (!token) {
              set((state) => {
                state.isLoading = false;
              });
              return;
            }
            try {
              const user = await authApi.getCurrentUser();
              set((state) => {
                state.user = user;
                state.isAuthenticated = true;
                state.isLoading = false;
              });
            } catch {
              set((state) => {
                state.user = null;
                state.token = null;
                state.isAuthenticated = false;
                state.isLoading = false;
              });
              localStorage.removeItem('speaksum-auth');
            }
          },

          refreshToken: async () => {
            try {
              const { token } = await authApi.refreshToken();
              set((state) => {
                state.token = token;
              });
            } catch {
              set((state) => {
                state.user = null;
                state.token = null;
                state.isAuthenticated = false;
              });
              throw new Error('Token refresh failed');
            }
          },

          // MVP helper: Set test token directly for development/demo
          setTestToken: (token: string) => {
            set((state) => {
              state.token = token;
              state.isAuthenticated = true;
              // Create a mock user for MVP
              state.user = {
                id: 'test-user',
                email: 'test@example.com',
                name: '测试用户',
                createdAt: new Date().toISOString(),
              };
            });
          },

          updateUser: (userData: Partial<User>) => {
            set((state) => {
              if (state.user) {
                state.user = { ...state.user, ...userData };
              }
            });
          },
        }),
        {
          name: 'speaksum-auth',
          partialize: (state) => ({ token: state.token }),
        }
      )
    )
  )
);
