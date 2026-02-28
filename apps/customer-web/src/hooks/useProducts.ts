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

interface ProductResponse {
  success: boolean;
  data: Product;
}

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
      if (filters.sort_by) params.set('sort_by', filters.sort_by);
      if (filters.cursor) params.set('cursor', filters.cursor);
      if (filters.limit) params.set('limit', String(filters.limit));

      const { data } = await api.get<ProductsResponse>(`/products?${params.toString()}`);
      return data;
    },
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const { data } = await api.get<ProductResponse>(`/products/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useStoreProducts(storeId: string, categoryId?: string) {
  return useQuery({
    queryKey: ['store-products', storeId, categoryId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (categoryId) params.set('category_id', categoryId);

      const { data } = await api.get<ProductsResponse>(
        `/stores/${storeId}/products?${params.toString()}`,
      );
      return data;
    },
    enabled: !!storeId,
  });
}

export type { Product, ProductVariant, ProductFilters };
