import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getTokens, setTokens, clearTokens } from './auth';
import type { ApiResponse, ApiError } from '../types';

const API_BASE_URL = __DEV__
  ? 'http://10.0.2.2:3001/api/v1' // Android emulator → host machine
  : 'https://api.daltaners.ph/api/v1';

// Service-specific base URLs for development
const SERVICE_URLS = __DEV__
  ? {
      auth: 'http://10.0.2.2:3001/api/v1',
      user: 'http://10.0.2.2:3002/api/v1',
      vendor: 'http://10.0.2.2:3003/api/v1',
      catalog: 'http://10.0.2.2:3004/api/v1',
      inventory: 'http://10.0.2.2:3005/api/v1',
      order: 'http://10.0.2.2:3006/api/v1',
      delivery: 'http://10.0.2.2:3007/api/v1',
      payment: 'http://10.0.2.2:3008/api/v1',
      notification: 'http://10.0.2.2:3010/api/v1',
      chat: 'http://10.0.2.2:3013/api/v1',
      zone: 'http://10.0.2.2:3014/api/v1',
      loyalty: 'http://10.0.2.2:3017/api/v1',
    }
  : {};

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach JWT token
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const tokens = await getTokens();
    if (tokens?.access_token) {
      config.headers.Authorization = `Bearer ${tokens.access_token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor — handle token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null): void {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);

    // Only retry on 401 (expired access token)
    if (error.response?.status === 401 && !(originalRequest as { _retry?: boolean })._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      (originalRequest as { _retry?: boolean })._retry = true;
      isRefreshing = true;

      try {
        const tokens = await getTokens();
        if (!tokens?.refresh_token) {
          throw new Error('No refresh token');
        }

        const { data } = await axios.post<ApiResponse<{ access_token: string; refresh_token: string }>>(
          `${SERVICE_URLS.auth || API_BASE_URL}/auth/refresh`,
          { refresh_token: tokens.refresh_token },
        );

        const newTokens = data.data;
        await setTokens(newTokens);

        processQueue(null, newTokens.access_token);
        originalRequest.headers.Authorization = `Bearer ${newTokens.access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        await clearTokens();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// Service-specific API instances for development
export function createServiceApi(service: keyof typeof SERVICE_URLS) {
  const baseURL = SERVICE_URLS[service] || API_BASE_URL;
  const instance = axios.create({
    baseURL,
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
  });

  // Apply same interceptors
  instance.interceptors.request.use(async (config) => {
    const tokens = await getTokens();
    if (tokens?.access_token) {
      config.headers.Authorization = `Bearer ${tokens.access_token}`;
    }
    return config;
  });

  return instance;
}

export const authApi = createServiceApi('auth');
export const userApi = createServiceApi('user');
export const vendorApi = createServiceApi('vendor');
export const catalogApi = createServiceApi('catalog');
export const inventoryApi = createServiceApi('inventory');
export const orderApi = createServiceApi('order');
export const deliveryApi = createServiceApi('delivery');
export const paymentApi = createServiceApi('payment');
export const chatApi = createServiceApi('chat');
export const loyaltyApi = createServiceApi('loyalty');

export default api;
