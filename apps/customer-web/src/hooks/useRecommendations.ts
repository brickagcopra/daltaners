import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface RecommendedProduct {
  id: string;
  name: string;
  slug: string;
  base_price: number;
  sale_price: number | null;
  rating_average: number;
  rating_count: number;
  total_sold: number;
  store_id: string;
  store_name?: string;
  category_id: string;
  category_name?: string;
  primary_image_url: string | null;
}

interface RecommendationResponse {
  success: boolean;
  data: RecommendedProduct[];
}

function transformProduct(p: RecommendedProduct) {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.base_price,
    sale_price: p.sale_price,
    rating: p.rating_average,
    review_count: p.rating_count,
    total_sold: p.total_sold,
    store_id: p.store_id,
    store_name: p.store_name || '',
    category_id: p.category_id,
    category_name: p.category_name || '',
    image_url: p.primary_image_url || `https://placehold.co/400x400/f3f4f6/374151?text=${encodeURIComponent(p.name)}`,
    in_stock: true,
  };
}

export function usePopularProducts(options?: {
  store_id?: string;
  category_id?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['recommendations', 'popular', options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.store_id) params.set('store_id', options.store_id);
      if (options?.category_id) params.set('category_id', options.category_id);
      if (options?.limit) params.set('limit', options.limit.toString());

      const { data } = await api.get<RecommendationResponse>(
        `/recommendations/popular?${params.toString()}`,
      );
      return (data?.data ?? []).map(transformProduct);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useFrequentlyBoughtTogether(productId: string, limit = 8) {
  return useQuery({
    queryKey: ['recommendations', 'together', productId, limit],
    queryFn: async () => {
      const { data } = await api.get<RecommendationResponse>(
        `/recommendations/together/${productId}?limit=${limit}`,
      );
      return (data?.data ?? []).map(transformProduct);
    },
    enabled: !!productId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useSimilarProducts(productId: string, limit = 8) {
  return useQuery({
    queryKey: ['recommendations', 'similar', productId, limit],
    queryFn: async () => {
      const { data } = await api.get<RecommendationResponse>(
        `/recommendations/similar/${productId}?limit=${limit}`,
      );
      return (data?.data ?? []).map(transformProduct);
    },
    enabled: !!productId,
    staleTime: 10 * 60 * 1000,
  });
}

export function usePersonalizedProducts(limit = 8) {
  return useQuery({
    queryKey: ['recommendations', 'personalized', limit],
    queryFn: async () => {
      const { data } = await api.get<RecommendationResponse>(
        `/recommendations/personalized?limit=${limit}`,
      );
      return (data?.data ?? []).map(transformProduct);
    },
    staleTime: 5 * 60 * 1000,
  });
}
