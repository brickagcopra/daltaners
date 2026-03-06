import { create } from 'zustand';
import { authApi } from '../services/api';
import { setTokens, clearTokens, getTokens, setStoredUser, getStoredUser } from '../services/auth';
import { connectNotifications, disconnectAll } from '../services/socket';
import type { User, AuthTokens } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  vendorLogin: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; phone: string; first_name: string; last_name: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  initialize: async () => {
    try {
      const tokens = await getTokens();
      if (!tokens?.access_token) {
        set({ isLoading: false });
        return;
      }

      const storedUser = await getStoredUser<User>();
      if (storedUser) {
        set({ user: storedUser, isAuthenticated: true, isLoading: false });
        connectNotifications().catch(() => {});
        return;
      }

      // Fetch user from API
      await get().refreshUser();
    } catch {
      await clearTokens();
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await authApi.post('/auth/login', { email, password });
      const { user, access_token, refresh_token } = data.data;
      await setTokens({ access_token, refresh_token });
      await setStoredUser(user);
      set({ user, isAuthenticated: true, isLoading: false });
      connectNotifications().catch(() => {});
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || 'Login failed';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  vendorLogin: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await authApi.post('/auth/vendor/login', { email, password });
      const response = data.data;
      const tokens: AuthTokens = {
        access_token: response.accessToken,
        refresh_token: response.refreshToken,
      };
      await setTokens(tokens);
      const user: User = {
        id: response.user.id,
        email: response.user.email,
        role: response.user.role,
        first_name: response.user.firstName,
        last_name: response.user.lastName,
        avatar_url: response.user.avatarUrl,
        vendor_id: response.user.vendorId,
      };
      await setStoredUser(user);
      set({ user, isAuthenticated: true, isLoading: false });
      connectNotifications().catch(() => {});
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || 'Vendor login failed';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  register: async (registerData) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await authApi.post('/auth/register', registerData);
      const { user, access_token, refresh_token } = data.data;
      await setTokens({ access_token, refresh_token });
      await setStoredUser(user);
      set({ user, isAuthenticated: true, isLoading: false });
      connectNotifications().catch(() => {});
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || 'Registration failed';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    try {
      const tokens = await getTokens();
      if (tokens?.refresh_token) {
        await authApi.post('/auth/logout', { refresh_token: tokens.refresh_token }).catch(() => {});
      }
    } finally {
      disconnectAll();
      await clearTokens();
      set({ user: null, isAuthenticated: false, isLoading: false, error: null });
    }
  },

  refreshUser: async () => {
    try {
      const { data } = await authApi.get('/auth/me');
      const user = data.data;
      await setStoredUser(user);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      await clearTokens();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
