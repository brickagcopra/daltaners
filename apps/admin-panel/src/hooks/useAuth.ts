import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

interface LoginPayload {
  email: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  data: {
    user: {
      id: string;
      email: string;
      name: string;
      role: 'admin';
      avatar?: string;
    };
    accessToken: string;
    refreshToken: string;
  };
}

export function useLogin() {
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const response = await api.post<LoginResponse>('/auth/login', payload);
      return response.data;
    },
    onSuccess: (data) => {
      const { user, accessToken, refreshToken } = data.data;
      if (user.role !== 'admin') {
        throw new Error('Access denied. Admin role required.');
      }
      setAuth(user, accessToken, refreshToken);
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
