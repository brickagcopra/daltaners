import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export interface Coupon {
  id: string;
  code: string;
  name: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed_amount' | 'free_delivery';
  discount_value: number;
  minimum_order_value: number;
  maximum_discount: number | null;
  applicable_categories: string[] | null;
  applicable_stores: string[] | null;
  usage_limit: number | null;
  usage_count: number;
  per_user_limit: number;
  is_first_order_only: boolean;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CouponsFilters {
  page: number;
  limit: number;
  search?: string;
  discount_type?: string;
  is_active?: string;
  is_expired?: string;
}

interface CouponsResponse {
  success: boolean;
  data: Coupon[];
  meta: { page: number; limit: number; total: number };
  timestamp: string;
}

interface CouponResponse {
  success: boolean;
  data: Coupon;
  timestamp: string;
}

export interface CreateCouponPayload {
  code: string;
  name: string;
  description?: string;
  discount_type: 'percentage' | 'fixed_amount' | 'free_delivery';
  discount_value: number;
  minimum_order_value?: number;
  maximum_discount?: number;
  applicable_categories?: string[];
  applicable_stores?: string[];
  usage_limit?: number;
  per_user_limit?: number;
  is_first_order_only?: boolean;
  valid_from: string;
  valid_until: string;
}

export interface UpdateCouponPayload extends Partial<CreateCouponPayload> {
  is_active?: boolean;
}

export function useAllCoupons(filters: CouponsFilters) {
  return useQuery({
    queryKey: ['admin', 'coupons', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(filters.page));
      params.set('limit', String(filters.limit));
      if (filters.search) params.set('search', filters.search);
      if (filters.discount_type) params.set('discount_type', filters.discount_type);
      if (filters.is_active) params.set('is_active', filters.is_active);
      if (filters.is_expired) params.set('is_expired', filters.is_expired);

      const { data } = await api.get<CouponsResponse>(`/orders/admin/coupons?${params}`);
      return data;
    },
    staleTime: 30_000,
  });
}

export function useCoupon(id: string | null) {
  return useQuery({
    queryKey: ['admin', 'coupon', id],
    queryFn: async () => {
      const { data } = await api.get<CouponResponse>(`/orders/admin/coupons/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateCouponPayload) => {
      const { data } = await api.post<CouponResponse>('/orders/admin/coupons', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'coupons'] });
    },
  });
}

export function useUpdateCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateCouponPayload & { id: string }) => {
      const { data } = await api.patch<CouponResponse>(`/orders/admin/coupons/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'coupons'] });
    },
  });
}

export function useDeleteCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/orders/admin/coupons/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'coupons'] });
    },
  });
}
