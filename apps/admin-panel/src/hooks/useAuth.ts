import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { useAuthStore, AdminUser } from '@/stores/auth.store';

interface LoginPayload {
  email: string;
  password: string;
}

interface BackendLoginResponse {
  success: boolean;
  data: {
    user: {
      id: string;
      email: string | null;
      phone: string | null;
      role: string;
      is_verified: boolean;
      is_active: boolean;
    };
    access_token: string;
    refresh_token: string;
  };
}

export function useLogin() {
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const response = await api.post<BackendLoginResponse>('/auth/login', payload);
      return response.data;
    },
    onSuccess: (data) => {
      const { user, access_token, refresh_token } = data.data;
      if (user.role !== 'admin') {
        throw new Error('Access denied. Admin role required.');
      }
      const adminUser: AdminUser = {
        id: user.id,
        email: user.email ?? '',
        name: user.email?.split('@')[0] ?? 'Admin',
        role: 'admin',
      };
      setAuth(adminUser, access_token, refresh_token);
      navigate('/');
    },
  });
}

export function useLogout() {
  const { logout, refreshToken } = useAuthStore();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout', { refreshToken });
    },
    onSettled: () => {
      logout();
      navigate('/login');
    },
  });
}
