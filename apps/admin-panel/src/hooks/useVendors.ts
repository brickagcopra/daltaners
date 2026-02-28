import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface Vendor {
  id: string;
  storeName: string;
  ownerName: string;
  ownerEmail: string;
  phone: string;
  category: string;
  status: 'pending' | 'active' | 'suspended' | 'rejected';
  address: string;
  city: string;
  rating: number;
  totalOrders: number;
  totalRevenue: number;
  commissionRate: number;
  documents: VendorDocument[];
  createdAt: string;
  approvedAt: string | null;
}

export interface VendorDocument {
  id: string;
  type: 'business_permit' | 'dti_registration' | 'bir_certificate' | 'valid_id';
  url: string;
  status: 'pending' | 'verified' | 'rejected';
  uploadedAt: string;
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

      const response = await api.get<VendorsResponse>(`/admin/vendors?${params.toString()}`);
      return response.data;
    },
  });
}

export function useVendor(id: string) {
  return useQuery({
    queryKey: ['admin', 'vendors', id],
    queryFn: async () => {
      const response = await api.get<VendorResponse>(`/admin/vendors/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useApproveVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, commissionRate }: { id: string; commissionRate: number }) => {
      const response = await api.post<VendorResponse>(`/admin/vendors/${id}/approve`, {
        commissionRate,
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
      const response = await api.post<VendorResponse>(`/admin/vendors/${id}/suspend`, {
        reason,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'vendors'] });
    },
  });
}
