import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { useNavigate } from 'react-router-dom';

interface LoginPayload {
  email?: string;
  phone?: string;
  password: string;
}

interface RegisterPayload {
  email?: string;
  phone?: string;
  password: string;
  first_name: string;
  last_name: string;
}

interface AuthResponse {
  success: boolean;
  data: {
    user: {
      id: string;
      email: string | null;
      phone: string | null;
      role: string;
      is_verified: boolean;
    };
    access_token: string;
    refresh_token: string;
  };
}

export function useLogin() {
  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const { data } = await api.post<AuthResponse>('/auth/login', payload);
      return data;
    },
    onSuccess: (data) => {
      const { user, access_token, refresh_token } = data.data;
      setAuth(user, access_token, refresh_token);
      navigate('/');
    },
  });
}

export function useRegister() {
  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (payload: RegisterPayload) => {
      const { data } = await api.post<AuthResponse>('/auth/register', payload);
      return data;
    },
    onSuccess: (data) => {
      const { user, access_token, refresh_token } = data.data;
      setAuth(user, access_token, refresh_token);
      navigate('/');
    },
  });
}

export function useLogout() {
  const logout = useAuthStore((state) => state.logout);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout');
    },
    onSettled: () => {
      logout();
      queryClient.clear();
      navigate('/login');
    },
  });
}

export function useMe() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const { data } = await api.get('/auth/me');
      return data.data;
    },
    enabled: isAuthenticated,
  });
}
