import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface User {
  id: string;
  email: string | null;
  phone: string | null;
  role: 'customer' | 'vendor_owner' | 'vendor_staff' | 'delivery' | 'admin';
  is_verified: boolean;
  is_active: boolean;
  mfa_enabled: boolean;
  last_login_at: string | null;
  created_at: string;
}

interface UsersFilters {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
}

interface UsersResponse {
  success: boolean;
  data: User[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface UserResponse {
  success: boolean;
  data: User;
}

interface CreateUserPayload {
  email?: string;
  phone?: string;
  password: string;
  first_name: string;
  last_name: string;
  role: string;
}

export function useUsers(filters: UsersFilters = {}) {
  const { page = 1, limit = 20, search, role, status } = filters;

  return useQuery({
    queryKey: ['admin', 'users', { page, limit, search, role, status }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (search) params.set('search', search);
      if (role) params.set('role', role);
      if (status) params.set('status', status);

      const response = await api.get<UsersResponse>(`/auth/admin/users?${params.toString()}`);
      return response.data;
    },
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ['admin', 'users', id],
    queryFn: async () => {
      const response = await api.get<UserResponse>(`/auth/admin/users/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const response = await api.patch<UserResponse>(`/auth/admin/users/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateUserPayload) => {
      const response = await api.post<UserResponse>('/auth/admin/users', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<{ success: boolean; data: { temporary_password: string } }>(
        `/auth/admin/users/${id}/reset-password`,
      );
      return response.data;
    },
  });
}
