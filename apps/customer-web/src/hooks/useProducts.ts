import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface ProductFilters {
  search?: string;
  category_id?: string;
  store_id?: string;
  min_price?: number;
  max_price?: number;
  sort_by?: 'price_asc' | 'price_desc' | 'newest' | 'popular';
  cursor?: string;
  limit?: number;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  sale_price: number | null;
  images: string[];
  category_id: string;
  category_name: string;
  store_id: string;
  store_name: string;
  rating: number;
  review_count: number;
  in_stock: boolean;
  variants: ProductVariant[];
}

interface ProductVariant {
  id: string;
  name: string;
  price: number;
  sale_price: number | null;
  in_stock: boolean;
  attributes: Record<string, string>;
}

interface ProductsResponse {
  success: boolean;
  data: Product[];
  meta: {
    next_cursor: string | null;
    limit: number;
    total: number;
  };
}

function resolveImageUrl(url: string): string {
  if (!url) return '/placeholder-product.png';
  return url;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformProduct(raw: any): Product {
  return {
    id: raw.id,
    name: raw.name || '',
    slug: raw.slug,
    description: raw.description || '',
    price: Number(raw.base_price ?? raw.price ?? 0),
    sale_price: raw.sale_price != null ? Number(raw.sale_price) : null,
    images: Array.isArray(raw.images) && raw.images.length > 0
      ? raw.images.map((img: unknown) => {
          const url = typeof img === 'string' ? img : (img as { url: string }).url;
          return resolveImageUrl(url);
        })
      : ['/placeholder-product.png'],
    category_id: raw.category_id || raw.category?.id || '',
    category_name: raw.category?.name || raw.category_name || '',
    store_id: raw.store_id || '',
    store_name: raw.store?.name || raw.store_name || '',
    rating: Number(raw.rating_average ?? raw.rating ?? 0),
    review_count: Number(raw.rating_count ?? raw.review_count ?? 0),
    in_stock: raw.in_stock !== undefined ? raw.in_stock : (raw.is_active !== undefined ? raw.is_active : true),
    variants: Array.isArray(raw.variants)
      ? raw.variants.map(transformVariant)
      : [],
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformVariant(raw: any): ProductVariant {
  return {
    id: raw.id,
    name: raw.name,
    price: Number(raw.price_adjustment ?? raw.price ?? 0),
    sale_price: raw.sale_price != null ? Number(raw.sale_price) : null,
    in_stock: raw.in_stock !== undefined ? raw.in_stock : (raw.stock_quantity != null ? raw.stock_quantity > 0 : true),
    attributes: raw.attributes || {},
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformProductsResponse(raw: any): ProductsResponse {
  // Backend returns { success, data: { items: [...], nextCursor, hasMore }, timestamp }
  const payload = raw.data;
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.items)
      ? payload.items
      : [];
  return {
    success: raw.success ?? true,
    data: items.map(transformProduct),
    meta: {
      next_cursor: raw.meta?.next_cursor ?? payload?.nextCursor ?? null,
      limit: raw.meta?.limit ?? raw.limit ?? 20,
      total: raw.meta?.total ?? raw.total ?? items.length,
    },
  };
}

// Map frontend-friendly sort values to backend ProductSortBy enum + SortOrder
const SORT_MAP: Record<string, { sort_by: string; sort_order: string }> = {
  popular:    { sort_by: 'total_sold', sort_order: 'DESC' },
  newest:     { sort_by: 'created_at', sort_order: 'DESC' },
  price_asc:  { sort_by: 'base_price', sort_order: 'ASC' },
  price_desc: { sort_by: 'base_price', sort_order: 'DESC' },
};

export function useProducts(filters: ProductFilters = {}) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.category_id) params.set('category_id', filters.category_id);
      if (filters.store_id) params.set('store_id', filters.store_id);
      if (filters.min_price !== undefined) params.set('min_price', String(filters.min_price));
      if (filters.max_price !== undefined) params.set('max_price', String(filters.max_price));
      if (filters.sort_by && SORT_MAP[filters.sort_by]) {
        params.set('sort_by', SORT_MAP[filters.sort_by].sort_by);
        params.set('sort_order', SORT_MAP[filters.sort_by].sort_order);
      }
      if (filters.cursor) params.set('cursor', filters.cursor);
      if (filters.limit) params.set('limit', String(filters.limit));

      const { data } = await api.get(`/products?${params.toString()}`);
      return transformProductsResponse(data);
    },
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const { data } = await api.get(`/products/${id}`);
      const raw = data.data ?? data;
      return transformProduct(raw);
    },
    enabled: !!id,
  });
}

export function useStoreProducts(storeId: string, categoryId?: string) {
  return useQuery({
    queryKey: ['store-products', storeId, categoryId],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('store_id', storeId);
      if (categoryId) params.set('category_id', categoryId);

      const { data } = await api.get(
        `/products?${params.toString()}`,
      );
      return transformProductsResponse(data);
    },
    enabled: !!storeId,
  });
}

export type { Product, ProductVariant, ProductFilters };
