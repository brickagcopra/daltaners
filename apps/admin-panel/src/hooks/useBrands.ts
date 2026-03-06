import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export type BrandStatus = 'pending' | 'verified' | 'active' | 'suspended' | 'rejected';

export interface Brand {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  website_url: string | null;
  country_of_origin: string | null;
  status: BrandStatus;
  verified_at: string | null;
  verified_by: string | null;
  is_featured: boolean;
  product_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface BrandStats {
  total: number;
  pending: number;
  verified: number;
  active: number;
  suspended: number;
  rejected: number;
}

interface BrandsQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sort_by?: string;
  sort_order?: string;
}

interface CreateBrandPayload {
  name: string;
  description?: string;
  logo_url?: string;
  banner_url?: string;
  website_url?: string;
  country_of_origin?: string;
}

interface UpdateBrandPayload {
  name?: string;
  description?: string;
  logo_url?: string;
  banner_url?: string;
  website_url?: string;
  country_of_origin?: string;
  is_featured?: boolean;
}

export const BRAND_STATUS_LABELS: Record<BrandStatus, string> = {
  pending: 'Pending',
  verified: 'Verified',
  active: 'Active',
  suspended: 'Suspended',
  rejected: 'Rejected',
};

export const BRAND_STATUS_COLORS: Record<BrandStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  verified: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800',
  suspended: 'bg-red-100 text-red-800',
  rejected: 'bg-gray-100 text-gray-800',
};

export function useAdminBrands(query: BrandsQuery = {}) {
  const { page = 1, limit = 20, search, status, sort_by, sort_order } = query;
  return useQuery({
    queryKey: ['admin-brands', page, limit, search, status, sort_by, sort_order],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      if (sort_by) params.set('sort_by', sort_by);
      if (sort_order) params.set('sort_order', sort_order);
      const { data } = await api.get(`/admin/brands?${params}`);
      return data as {
        success: boolean;
        data: Brand[];
        meta: { page: number; limit: number; total: number; totalPages: number };
      };
    },
  });
}

export function useAdminBrandStats() {
  return useQuery({
    queryKey: ['admin-brand-stats'],
    queryFn: async () => {
      const { data } = await api.get('/admin/brands/stats');
      return data.data as BrandStats;
    },
  });
}

export function useAdminBrand(id: string) {
  return useQuery({
    queryKey: ['admin-brand', id],
    queryFn: async () => {
      const { data } = await api.get(`/admin/brands/${id}`);
      return data.data as Brand;
    },
    enabled: !!id,
  });
}

export function useCreateBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateBrandPayload) => {
      const { data } = await api.post('/admin/brands', payload);
      return data.data as Brand;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-brands'] });
      queryClient.invalidateQueries({ queryKey: ['admin-brand-stats'] });
    },
  });
}

export function useUpdateBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateBrandPayload & { id: string }) => {
      const { data } = await api.patch(`/admin/brands/${id}`, payload);
      return data.data as Brand;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-brands'] });
      queryClient.invalidateQueries({ queryKey: ['admin-brand-stats'] });
    },
  });
}

export function useVerifyBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/admin/brands/${id}/verify`);
      return data.data as Brand;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-brands'] });
      queryClient.invalidateQueries({ queryKey: ['admin-brand-stats'] });
    },
  });
}

export function useActivateBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/admin/brands/${id}/activate`);
      return data.data as Brand;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-brands'] });
      queryClient.invalidateQueries({ queryKey: ['admin-brand-stats'] });
    },
  });
}

export function useRejectBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/admin/brands/${id}/reject`);
      return data.data as Brand;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-brands'] });
      queryClient.invalidateQueries({ queryKey: ['admin-brand-stats'] });
    },
  });
}

export function useSuspendBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/admin/brands/${id}/suspend`);
      return data.data as Brand;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-brands'] });
      queryClient.invalidateQueries({ queryKey: ['admin-brand-stats'] });
    },
  });
}

export function useDeleteBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/brands/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-brands'] });
      queryClient.invalidateQueries({ queryKey: ['admin-brand-stats'] });
    },
  });
}
