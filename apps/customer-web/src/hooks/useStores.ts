import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface OperatingHours {
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

interface StoreLocation {
  lat: number;
  lng: number;
  address: string;
}

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
  operating_hours: OperatingHours[];
  location?: StoreLocation;
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

function resolveStoreImageUrl(url: string | null | undefined): string {
  return url || '/placeholder-store.png';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformStore(raw: any): Store {
  const primaryLocation = Array.isArray(raw.locations)
    ? raw.locations.find((l: { is_primary: boolean }) => l.is_primary) || raw.locations[0]
    : null;
  const name = raw.name || '';

  return {
    id: raw.id,
    name,
    slug: raw.slug,
    description: raw.description || '',
    logo_url: resolveStoreImageUrl(raw.logo_url),
    banner_url: resolveStoreImageUrl(raw.banner_url),
    category: formatCategory(raw.category),
    rating: Number(raw.rating_average ?? raw.rating ?? 0),
    review_count: Number(raw.rating_count ?? raw.review_count ?? 0),
    delivery_time_min: raw.delivery_time_min ?? raw.preparation_time_minutes ?? 30,
    delivery_time_max: raw.delivery_time_max ?? (raw.preparation_time_minutes ? raw.preparation_time_minutes + 15 : 45),
    delivery_fee: Number(raw.delivery_fee ?? 0),
    min_order: Number(raw.minimum_order_value ?? raw.min_order ?? 0),
    is_open: raw.is_open !== undefined ? raw.is_open : (raw.status?.toLowerCase() === 'active'),
    address: raw.address || primaryLocation?.address_line1 || '',
    lat: Number(raw.lat ?? primaryLocation?.latitude ?? 0),
    lng: Number(raw.lng ?? primaryLocation?.longitude ?? 0),
    distance_km: raw.distance_km,
    categories: raw.categories || [],
    operating_hours: raw.operating_hours || [],
    location: raw.location
      ? {
          lat: Number(raw.location.latitude ?? raw.location.lat ?? 0),
          lng: Number(raw.location.longitude ?? raw.location.lng ?? 0),
          address: raw.location.address_line1 || raw.location.address || '',
        }
      : undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformNearbyStoreItem(raw: any): Store {
  const store = raw.store || raw;
  const transformed = transformStore(store);

  if (raw.distance_meters != null) {
    transformed.distance_km = Number(raw.distance_meters) / 1000;
  }
  if (raw.address_line1 && !transformed.address) {
    transformed.address = raw.address_line1;
  }
  if (raw.latitude && !transformed.lat) {
    transformed.lat = Number(raw.latitude);
  }
  if (raw.longitude && !transformed.lng) {
    transformed.lng = Number(raw.longitude);
  }

  return transformed;
}

function formatCategory(category: string): string {
  if (!category) return '';
  return category
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function useNearbyStores(lat?: number, lng?: number) {
  return useQuery({
    queryKey: ['nearby-stores', lat, lng],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (lat !== undefined) params.set('latitude', String(lat));
      if (lng !== undefined) params.set('longitude', String(lng));

      const { data } = await api.get(`/stores/nearby?${params.toString()}`);
      const items = data.data || data.items || data || [];
      const storeList = Array.isArray(items) ? items : [];
      return {
        success: data.success ?? true,
        data: storeList.map(transformNearbyStoreItem),
        meta: {
          next_cursor: data.meta?.next_cursor ?? data.nextCursor ?? null,
          limit: data.meta?.limit ?? 12,
          total: data.meta?.total ?? storeList.length,
        },
      } as StoresResponse;
    },
    enabled: lat !== undefined && lng !== undefined,
  });
}

export function useStore(slug: string) {
  return useQuery({
    queryKey: ['store', slug],
    queryFn: async () => {
      const { data } = await api.get(`/stores/${slug}`);
      const raw = data.data ?? data;
      return transformStore(raw);
    },
    enabled: !!slug,
  });
}

export type { Store, StoreCategory, OperatingHours, StoreLocation };
