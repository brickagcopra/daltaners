import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface Vendor {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  category: string;
  status: 'pending' | 'active' | 'suspended' | 'closed';
  commission_rate: number | null;
  subscription_tier: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  business_permit_url: string | null;
  dti_registration: string | null;
  bir_tin: string | null;
  rating_average: number;
  rating_count: number;
  total_orders: number;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  locations: VendorLocation[];
}

export interface VendorLocation {
  id: string;
  branch_name: string;
  address_line1: string;
  city: string;
  province: string;
  latitude: number;
  longitude: number;
  is_primary: boolean;
}

interface VendorsFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  category?: string;
}

interface VendorsResponse {
  success: boolean;
  data: Vendor[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface VendorResponse {
  success: boolean;
  data: Vendor;
}

interface VendorStatsResponse {
  success: boolean;
  data: {
    totalStores: number;
    activeStores: number;
    pendingStores: number;
    suspendedStores: number;
    storesByCategory: { category: string; count: number }[];
    storesByTier: { tier: string; count: number }[];
    averageRating: number;
    totalOrders: number;
  };
}

export function useVendors(filters: VendorsFilters = {}) {
  const { page = 1, limit = 20, search, status, category } = filters;

  return useQuery({
    queryKey: ['admin', 'vendors', { page, limit, search, status, category }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      if (category) params.set('category', category);

      const response = await api.get<VendorsResponse>(`/vendors/admin/stores?${params.toString()}`);
      return response.data;
    },
  });
}

export function useVendor(id: string) {
  return useQuery({
    queryKey: ['admin', 'vendors', id],
    queryFn: async () => {
      const response = await api.get<VendorResponse>(`/vendors/admin/stores/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useVendorStats() {
  return useQuery({
    queryKey: ['admin', 'vendors', 'stats'],
    queryFn: async () => {
      const response = await api.get<VendorStatsResponse>('/vendors/admin/stats');
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useApproveVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, commission_rate }: { id: string; commission_rate?: number }) => {
      const response = await api.post<VendorResponse>(`/vendors/admin/stores/${id}/approve`, {
        commission_rate,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'vendors'] });
    },
  });
}

export function useSuspendVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const response = await api.post<VendorResponse>(`/vendors/admin/stores/${id}/suspend`, {
        reason,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'vendors'] });
    },
  });
}

export function useReactivateVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const response = await api.post<VendorResponse>(`/vendors/admin/stores/${id}/reactivate`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'vendors'] });
    },
  });
}
