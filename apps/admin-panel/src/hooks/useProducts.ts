import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface AdminProduct {
  id: string;
  store_id: string;
  store_name?: string;
  category_id: string;
  category_name?: string;
  name: string;
  slug: string;
  sku: string | null;
  description: string;
  base_price: number;
  sale_price: number | null;
  cost_price: number | null;
  status: 'active' | 'draft' | 'pending_review' | 'rejected' | 'archived';
  is_featured: boolean;
  stock_quantity?: number;
  images: { url: string; alt: string; sort_order: number }[];
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ProductStats {
  total: number;
  active: number;
  draft: number;
  pending: number;
  outOfStock: number;
  featured: number;
  avgPrice: number;
  byCategory: { category: string; count: number }[];
}

interface ProductsFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  store_id?: string;
  category_id?: string;
  is_featured?: boolean;
  price_min?: number;
  price_max?: number;
}

interface ProductsResponse {
  success: boolean;
  data: AdminProduct[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ProductResponse {
  success: boolean;
  data: AdminProduct;
}

interface ProductStatsResponse {
  success: boolean;
  data: ProductStats;
}

export function useAdminProducts(filters: ProductsFilters = {}) {
  const {
    page = 1, limit = 20, search, status, store_id,
    category_id, is_featured, price_min, price_max,
  } = filters;

  return useQuery({
    queryKey: ['admin', 'products', { page, limit, search, status, store_id, category_id, is_featured, price_min, price_max }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      if (store_id) params.set('store_id', store_id);
      if (category_id) params.set('category_id', category_id);
      if (is_featured !== undefined) params.set('is_featured', String(is_featured));
      if (price_min !== undefined) params.set('price_min', String(price_min));
      if (price_max !== undefined) params.set('price_max', String(price_max));

      const response = await api.get<ProductsResponse>(`/admin/products?${params.toString()}`);
      return response.data;
    },
  });
}

export function useAdminProductDetail(id: string) {
  return useQuery({
    queryKey: ['admin', 'product', id],
    queryFn: async () => {
      const response = await api.get<ProductResponse>(`/admin/products/${id}`);
      return response.data.data;
    },
    enabled: !!id,
  });
}

const defaultStats: ProductStats = {
  total: 0,
  active: 0,
  draft: 0,
  pending: 0,
  outOfStock: 0,
  featured: 0,
  avgPrice: 0,
  byCategory: [],
};

export function useAdminProductStats() {
  return useQuery({
    queryKey: ['admin', 'products', 'stats'],
    queryFn: async () => {
      const response = await api.get<ProductStatsResponse>('/admin/products/stats');
      const raw = response.data;
      const stats = raw?.data && typeof raw.data === 'object' && 'total' in raw.data
        ? raw.data
        : defaultStats;
      return { success: true, data: stats } as ProductStatsResponse;
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useApproveProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.patch<ProductResponse>(`/admin/products/${id}/approve`);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
  });
}

export function useRejectProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const response = await api.patch<ProductResponse>(`/admin/products/${id}/reject`, { reason });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
  });
}

export function useToggleFeatureProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.patch<ProductResponse>(`/admin/products/${id}/feature`);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
  });
}

export function useBulkProductAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      product_ids,
      action,
    }: {
      product_ids: string[];
      action: 'approve' | 'reject' | 'feature' | 'unfeature';
    }) => {
      const response = await api.post('/admin/products/bulk-action', { product_ids, action });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
  });
}

export const PRODUCT_STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  draft: 'Draft',
  pending_review: 'Pending Review',
  rejected: 'Rejected',
  archived: 'Archived',
};

export const PRODUCT_STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  draft: 'bg-gray-100 text-gray-800',
  pending_review: 'bg-yellow-100 text-yellow-800',
  rejected: 'bg-red-100 text-red-800',
  archived: 'bg-purple-100 text-purple-800',
};
