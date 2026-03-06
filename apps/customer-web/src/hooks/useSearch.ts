import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Product } from '@/hooks/useProducts';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SearchFilters {
  q?: string;
  category_id?: string;
  store_id?: string;
  brand?: string;
  min_price?: number;
  max_price?: number;
  dietary_tags?: string[];
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  page?: number;
  size?: number;
}

interface SearchHit {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  short_description: string | null;
  category_id: string;
  category_name: string | null;
  brand: string | null;
  slug: string;
  base_price: number;
  sale_price: number | null;
  rating_average: number;
  rating_count: number;
  total_sold: number;
  dietary_tags: string[];
  is_active: boolean;
  image_url: string | null;
}

export interface BucketAgg {
  key: string;
  doc_count: number;
}

export interface SearchAggregations {
  categories?: { buckets: BucketAgg[] };
  brands?: { buckets: BucketAgg[] };
  price_range?: { min: number; max: number; avg: number };
  dietary_tags?: { buckets: BucketAgg[] };
}

export interface SearchResponse {
  success: boolean;
  data: Product[];
  meta: {
    total: number;
    page: number;
    size: number;
    total_pages: number;
  };
  aggregations?: SearchAggregations;
}

// ─── Transform ES hit → Product ──────────────────────────────────────────────

function hitToProduct(hit: SearchHit): Product {
  return {
    id: hit.id,
    name: hit.name,
    slug: hit.slug,
    description: hit.description || '',
    price: hit.base_price,
    sale_price: hit.sale_price,
    images: hit.image_url ? [hit.image_url] : ['/placeholder-product.png'],
    category_id: hit.category_id,
    category_name: hit.category_name || '',
    store_id: hit.store_id,
    store_name: '',
    rating: hit.rating_average,
    review_count: hit.rating_count,
    in_stock: hit.is_active,
    variants: [],
  };
}

// ─── useSearch ────────────────────────────────────────────────────────────────

export function useSearch(filters: SearchFilters) {
  return useQuery<SearchResponse>({
    queryKey: ['search', filters],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters.q) params.set('q', filters.q);
      if (filters.category_id) params.set('category_id', filters.category_id);
      if (filters.store_id) params.set('store_id', filters.store_id);
      if (filters.brand) params.set('brand', filters.brand);
      if (filters.min_price !== undefined) params.set('min_price', String(filters.min_price));
      if (filters.max_price !== undefined) params.set('max_price', String(filters.max_price));
      if (filters.dietary_tags?.length) params.set('dietary_tags', filters.dietary_tags.join(','));
      if (filters.sort_by) params.set('sort_by', filters.sort_by);
      if (filters.sort_order) params.set('sort_order', filters.sort_order);
      if (filters.page !== undefined) params.set('page', String(filters.page));
      if (filters.size) params.set('size', String(filters.size));

      const { data } = await api.get(`/search?${params.toString()}`);

      const items: SearchHit[] = data.data ?? [];

      return {
        success: data.success ?? true,
        data: items.map(hitToProduct),
        meta: {
          total: data.meta?.total ?? 0,
          page: data.meta?.page ?? 0,
          size: data.meta?.size ?? 20,
          total_pages: data.meta?.total_pages ?? 0,
        },
        aggregations: data.aggregations,
      };
    },
    enabled: !!(filters.q || filters.category_id || filters.store_id || filters.brand),
    staleTime: 30_000,
  });
}

// ─── useSearchSuggestions ─────────────────────────────────────────────────────

export function useSearchSuggestions(query: string) {
  return useQuery<string[]>({
    queryKey: ['search-suggest', query],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('q', query);
      params.set('size', '8');

      const { data } = await api.get(`/search/suggest?${params.toString()}`);
      return data.data ?? [];
    },
    enabled: query.trim().length >= 2,
    staleTime: 60_000,
  });
}
