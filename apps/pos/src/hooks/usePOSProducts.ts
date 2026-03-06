import { useQuery } from '@tanstack/react-query';
import { api, type ApiResponse } from '@/lib/api';

interface CatalogProduct {
  id: string;
  store_id: string;
  category_id: string;
  name: string;
  sku: string;
  barcode: string | null;
  base_price: number;
  sale_price: number | null;
  is_active: boolean;
  unit_type: string;
  images: Array<{ url: string; thumbnail_url: string }>;
}

export function usePOSProducts(storeId: string | undefined) {
  return useQuery({
    queryKey: ['pos', 'products', storeId],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<CatalogProduct[]>>(`/catalog/products`, {
        params: { store_id: storeId, limit: 200 },
      });
      return data.data;
    },
    enabled: !!storeId,
    staleTime: 5 * 60 * 1000, // 5 min — product list doesn't change often
  });
}

interface Category {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
  level: number;
  children: Category[];
}

export function useCategories() {
  return useQuery({
    queryKey: ['pos', 'categories'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Category[]>>('/catalog/categories');
      return data.data;
    },
    staleTime: 10 * 60 * 1000,
  });
}
