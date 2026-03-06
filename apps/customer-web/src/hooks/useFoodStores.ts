import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface FoodStore {
  id: string;
  name: string;
  slug: string;
  description: string;
  logo_url: string | null;
  banner_url: string | null;
  category: string;
  rating_average: number;
  rating_count: number;
  preparation_time_minutes: number;
  minimum_order_value: number;
  is_featured: boolean;
  metadata: Record<string, unknown>;
  distance?: string;
}

interface FoodStoresParams {
  lat?: number;
  lng?: number;
  cuisine?: string;
  dietary?: string;
  open_now?: boolean;
}

export function useFoodStores(params: FoodStoresParams = {}) {
  return useQuery({
    queryKey: ['food-stores', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      searchParams.set('category', 'restaurant');
      if (params.lat) searchParams.set('lat', params.lat.toString());
      if (params.lng) searchParams.set('lng', params.lng.toString());
      if (params.cuisine) searchParams.set('cuisine', params.cuisine);
      if (params.dietary) searchParams.set('dietary', params.dietary);
      if (params.open_now) searchParams.set('open_now', 'true');

      const { data } = await api.get(`/stores?${searchParams.toString()}`);
      return (data?.data || []) as FoodStore[];
    },
    staleTime: 60000,
  });
}
