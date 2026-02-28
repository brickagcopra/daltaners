import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface Store {
  id: string;
  name: string;
  slug: string;
  description: string;
  logo_url: string;
  banner_url: string;
  category: string;
  rating: number;
  review_count: number;
  delivery_time_min: number;
  delivery_time_max: number;
  delivery_fee: number;
  min_order: number;
  is_open: boolean;
  address: string;
  lat: number;
  lng: number;
  distance_km?: number;
  categories: StoreCategory[];
}

interface StoreCategory {
  id: string;
  name: string;
  product_count: number;
}

interface StoresResponse {
  success: boolean;
  data: Store[];
  meta: {
    next_cursor: string | null;
    limit: number;
    total: number;
  };
}

interface StoreResponse {
  success: boolean;
  data: Store;
}

export function useNearbyStores(lat?: number, lng?: number) {
  return useQuery({
    queryKey: ['nearby-stores', lat, lng],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (lat !== undefined) params.set('lat', String(lat));
      if (lng !== undefined) params.set('lng', String(lng));
      params.set('limit', '12');

      const { data } = await api.get<StoresResponse>(`/stores/nearby?${params.toString()}`);
      return data;
    },
    enabled: lat !== undefined && lng !== undefined,
  });
}

export function useStore(slug: string) {
  return useQuery({
    queryKey: ['store', slug],
    queryFn: async () => {
      const { data } = await api.get<StoreResponse>(`/stores/${slug}`);
      return data.data;
    },
    enabled: !!slug,
  });
}

export type { Store, StoreCategory };
