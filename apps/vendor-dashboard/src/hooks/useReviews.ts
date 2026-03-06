import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

interface ReviewsQuery {
  page?: number;
  limit?: number;
}

export function useVendorReviews(query: ReviewsQuery = {}) {
  const { page = 1, limit = 20 } = query;
  return useQuery({
    queryKey: ['vendor-reviews', page, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      const { data } = await api.get(`/catalog/reviews/vendor/my-reviews?${params}`);
      return data as {
        success: boolean;
        data: Review[];
        meta: { page: number; limit: number; total: number; totalPages: number };
      };
    },
  });
}

export function useRespondToReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ reviewId, response }: { reviewId: string; response: string }) => {
      const { data } = await api.post(`/catalog/reviews/${reviewId}/response`, { response });
      return data.data as Review;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-reviews'] });
    },
  });
}
