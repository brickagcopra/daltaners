import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiResponse } from '@/lib/api';

export type DiscountType = 'percentage' | 'fixed_amount' | 'free_delivery';

export interface Coupon {
  id: string;
  code: string;
  name: string;
  description: string | null;
  discount_type: DiscountType;
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

export interface CouponFilters {
  search?: string;
  discount_type?: string;
  is_active?: boolean;
  is_expired?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateCouponPayload {
  code: string;
  name: string;
  description?: string;
  discount_type: DiscountType;
  discount_value: number;
  minimum_order_value?: number;
  maximum_discount?: number;
  applicable_categories?: string[];
  usage_limit?: number;
  per_user_limit?: number;
  is_first_order_only?: boolean;
  valid_from: string;
  valid_until: string;
}

export interface UpdateCouponPayload extends Partial<CreateCouponPayload> {
  is_active?: boolean;
}

export function useVendorCoupons(filters: CouponFilters = {}) {
  return useQuery({
    queryKey: ['vendor-coupons', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.discount_type) params.set('discount_type', filters.discount_type);
      if (filters.is_active !== undefined) params.set('is_active', String(filters.is_active));
      if (filters.is_expired !== undefined) params.set('is_expired', String(filters.is_expired));
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));

      const { data } = await api.get<ApiResponse<Coupon[]>>(
        `/orders/vendor/coupons?${params.toString()}`,
      );
      return data;
    },
  });
}

export function useCreateVendorCoupon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateCouponPayload) => {
      const { data } = await api.post<ApiResponse<Coupon>>(
        '/orders/vendor/coupons',
        payload,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-coupons'] });
    },
  });
}

export function useUpdateVendorCoupon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateCouponPayload & { id: string }) => {
      const { data } = await api.patch<ApiResponse<Coupon>>(
        `/orders/vendor/coupons/${id}`,
        payload,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-coupons'] });
    },
  });
}

export function useDeleteVendorCoupon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/orders/vendor/coupons/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-coupons'] });
    },
  });
}
