import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface Review {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  order_id: string | null;
  reviewable_type: 'store' | 'product' | 'delivery_personnel';
  reviewable_id: string;
  reviewable_name: string;
  rating: number;
  title: string | null;
  body: string | null;
  images: string[];
  is_verified_purchase: boolean;
  is_approved: boolean;
  vendor_response: string | null;
  vendor_response_at: string | null;
  helpful_count: number;
  created_at: string;
  updated_at: string;
}

interface AdminReviewsQuery {
  page?: number;
  limit?: number;
  search?: string;
  reviewable_type?: string;
  is_approved?: string;
  rating?: string;
}

export function useAdminReviews(query: AdminReviewsQuery = {}) {
  const { page = 1, limit = 20, search, reviewable_type, is_approved, rating } = query;
  return useQuery({
    queryKey: ['admin-reviews', page, limit, search, reviewable_type, is_approved, rating],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (search) params.set('search', search);
      if (reviewable_type) params.set('reviewable_type', reviewable_type);
      if (is_approved !== undefined && is_approved !== '') params.set('is_approved', is_approved);
      if (rating) params.set('rating', rating);
      const { data } = await api.get(`/catalog/reviews/admin/all?${params}`);
      return data as {
        success: boolean;
        data: Review[];
        meta: { page: number; limit: number; total: number; totalPages: number };
      };
    },
  });
}

export function useApproveReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reviewId: string) => {
      const { data } = await api.post(`/catalog/reviews/admin/${reviewId}/approve`);
      return data.data as Review;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
    },
  });
}

export function useRejectReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reviewId: string) => {
      const { data } = await api.post(`/catalog/reviews/admin/${reviewId}/reject`);
      return data.data as Review;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
    },
  });
}

export function useDeleteAdminReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reviewId: string) => {
      await api.delete(`/catalog/reviews/admin/${reviewId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
    },
  });
}
