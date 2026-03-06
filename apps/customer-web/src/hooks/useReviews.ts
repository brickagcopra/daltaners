import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

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

export interface ReviewStats {
  average: number;
  count: number;
  distribution: Record<number, number>;
}

interface ReviewFilters {
  reviewable_type: 'store' | 'product' | 'delivery_personnel';
  reviewable_id: string;
  rating?: number;
  sort_by?: 'created_at' | 'rating' | 'helpful_count';
  sort_order?: 'ASC' | 'DESC';
  limit?: number;
}

interface CreateReviewPayload {
  reviewable_type: 'store' | 'product' | 'delivery_personnel';
  reviewable_id: string;
  order_id?: string;
  rating: number;
  title?: string;
  body?: string;
  images?: string[];
}

export function useReviews(filters: ReviewFilters) {
  return useInfiniteQuery({
    queryKey: ['reviews', filters],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      const params = new URLSearchParams();
      params.set('reviewable_type', filters.reviewable_type);
      params.set('reviewable_id', filters.reviewable_id);
      if (filters.rating) params.set('rating', String(filters.rating));
      if (filters.sort_by) params.set('sort_by', filters.sort_by);
      if (filters.sort_order) params.set('sort_order', filters.sort_order);
      params.set('limit', String(filters.limit || 10));
      if (pageParam) params.set('cursor', pageParam);

      const { data } = await api.get(`/reviews?${params}`);
      return data as {
        success: boolean;
        data: Review[];
        meta: { cursor: string | null; limit: number; hasMore: boolean; total: number };
      };
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage?.meta?.cursor ?? undefined,
    enabled: !!filters.reviewable_id,
  });
}

export function useReviewStats(reviewable_type: string, reviewable_id: string) {
  return useQuery({
    queryKey: ['review-stats', reviewable_type, reviewable_id],
    queryFn: async () => {
      const { data } = await api.get(
        `/reviews/stats?reviewable_type=${reviewable_type}&reviewable_id=${reviewable_id}`,
      );
      return (data.data as ReviewStats) ?? { average: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
    },
    enabled: !!reviewable_id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateReviewPayload) => {
      const { data } = await api.post('/reviews', payload);
      return data.data as Review;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      queryClient.invalidateQueries({
        queryKey: ['review-stats', variables.reviewable_type, variables.reviewable_id],
      });
    },
  });
}

export function useToggleHelpful() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reviewId: string) => {
      const { data } = await api.post(`/reviews/${reviewId}/helpful`);
      return data.data as { helpful: boolean };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
  });
}

export function useDeleteReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reviewId: string) => {
      await api.delete(`/reviews/${reviewId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      queryClient.invalidateQueries({ queryKey: ['review-stats'] });
    },
  });
}
