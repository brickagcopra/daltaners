import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api, ApiResponse } from '@/lib/api';
import { useAuthStore, PosUser } from '@/stores/auth.store';
import { queryClient } from '@/lib/query-client';

interface LoginCredentials {
  email: string;
  password: string;
}

interface LoginResponse {
  user: PosUser;
  accessToken: string;
  refreshToken: string;
}

export function useLogin() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const { data } = await api.post<ApiResponse<LoginResponse>>(
        '/auth/vendor/login',
        credentials,
      );
      return data.data;
    },
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken);
      navigate('/');
    },
  });
}

export function useLogout() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const refreshToken = useAuthStore((s) => s.refreshToken);

  return useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout', { refreshToken });
    },
    onSettled: () => {
      logout();
      queryClient.clear();
      navigate('/login');
    },
  });
}
