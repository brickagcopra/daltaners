import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: 'customer' | 'vendor_owner' | 'vendor_staff' | 'delivery' | 'admin';
  status: 'active' | 'suspended' | 'banned';
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  avatar?: string;
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

      const response = await api.get<UsersResponse>(`/admin/users?${params.toString()}`);
      return response.data;
    },
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ['admin', 'users', id],
    queryFn: async () => {
      const response = await api.get<UserResponse>(`/admin/users/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<User> }) => {
      const response = await api.patch<UserResponse>(`/admin/users/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}
