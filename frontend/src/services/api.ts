import axios, { type AxiosInstance, type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';

const LOCAL_LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

export function resolveApiBaseUrl(configuredUrl: string, currentHost?: string): string {
  const normalizedUrl = configuredUrl.trim().replace(/\/+$/, '');

  try {
    const url = new URL(normalizedUrl);
    const activeHost =
      currentHost ??
      (typeof window !== 'undefined' ? window.location.hostname : undefined);

    if (
      LOCAL_LOOPBACK_HOSTS.has(url.hostname) &&
      (!activeHost || LOCAL_LOOPBACK_HOSTS.has(activeHost))
    ) {
      url.hostname = '127.0.0.1';
    }

    return url.toString().replace(/\/+$/, '');
  } catch {
    return normalizedUrl;
  }
}

const API_BASE_URL = resolveApiBaseUrl(
  import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1'
);

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor - add auth token
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = useAuthStore.getState().token;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle errors and token refresh
    this.client.interceptors.response.use(
      (response) => response.data,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            await useAuthStore.getState().refreshToken();
            const newToken = useAuthStore.getState().token;
            if (newToken) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.client.request(originalRequest);
            }
          } catch {
            useAuthStore.getState().logout();
          }
        }

        if (error.response?.status === 403) {
          useUIStore.getState().addNotification({
            type: 'error',
            message: '权限不足，无法访问此资源',
          });
        }

        return Promise.reject(error);
      }
    );
  }

  // HTTP methods
  get<T>(url: string, params?: object): Promise<T> {
    return this.client.get(url, { params });
  }

  post<T>(url: string, data?: object): Promise<T> {
    return this.client.post(url, data);
  }

  put<T>(url: string, data?: object): Promise<T> {
    return this.client.put(url, data);
  }

  patch<T>(url: string, data?: object): Promise<T> {
    return this.client.patch(url, data);
  }

  delete<T>(url: string): Promise<T> {
    return this.client.delete(url);
  }

  // File upload with progress
  upload<T>(
    url: string,
    file: File,
    onProgress?: (progress: number) => void,
    extraFields?: Record<string, string>
  ): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);
    if (extraFields) {
      Object.entries(extraFields).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    return this.client.post(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        const progress = progressEvent.total
          ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
          : 0;
        onProgress?.(progress);
      },
    });
  }
}

export const apiClient = new ApiClient();
