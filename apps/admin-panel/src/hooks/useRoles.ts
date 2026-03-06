import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// Types

export interface PermissionGroup {
  group: string;
  label: string;
  permissions: Permission[];
}

export interface Permission {
  key: string;
  label: string;
  description: string;
}

export interface AdminRole {
  id: string;
  name: string;
  display_name: string;
  description: string;
  is_system: boolean;
  permissions: string[];
  admin_count: number;
  created_at: string;
  updated_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role_id: string;
  role_name: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

interface AdminUsersFilters {
  page?: number;
  limit?: number;
  search?: string;
  role_id?: string;
  status?: string;
}

// --- Role hooks ---

export function useAdminRoles(search?: string) {
  return useQuery({
    queryKey: ['admin', 'roles', { search }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const response = await api.get<{ success: boolean; data: AdminRole[] }>(
        `/admin/roles?${params.toString()}`,
      );
      return response.data;
    },
  });
}

export function useAdminRole(id: string) {
  return useQuery({
    queryKey: ['admin', 'roles', id],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: AdminRole }>(`/admin/roles/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function usePermissionGroups() {
  return useQuery({
    queryKey: ['admin', 'permissions'],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: PermissionGroup[] }>('/admin/permissions');
      return response.data;
    },
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      display_name: string;
      description: string;
      permissions: string[];
    }) => {
      const response = await api.post<{ success: boolean; data: AdminRole }>('/admin/roles', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] });
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<{ display_name: string; description: string; permissions: string[] }>;
    }) => {
      const response = await api.patch<{ success: boolean; data: AdminRole }>(`/admin/roles/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] });
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/roles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] });
    },
  });
}

// --- Admin User hooks ---

export function useAdminUsers(filters: AdminUsersFilters = {}) {
  const { page = 1, limit = 20, search, role_id, status } = filters;

  return useQuery({
    queryKey: ['admin', 'admin-users', { page, limit, search, role_id, status }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (search) params.set('search', search);
      if (role_id) params.set('role_id', role_id);
      if (status) params.set('status', status);

      const response = await api.get<{
        success: boolean;
        data: AdminUser[];
        meta: { page: number; limit: number; total: number; totalPages: number };
      }>(`/admin/admin-users?${params.toString()}`);
      return response.data;
    },
  });
}

export function useCreateAdminUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      email: string;
      first_name: string;
      last_name: string;
      role_id: string;
      password: string;
    }) => {
      const response = await api.post<{ success: boolean; data: AdminUser }>('/admin/admin-users', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] });
    },
  });
}

export function useUpdateAdminUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<{ first_name: string; last_name: string; role_id: string; is_active: boolean }>;
    }) => {
      const response = await api.patch<{ success: boolean; data: AdminUser }>(`/admin/admin-users/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] });
    },
  });
}

export function useDeleteAdminUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/admin-users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] });
    },
  });
}
