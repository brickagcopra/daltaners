import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

// ── Types ────────────────────────────────────────────────────────────────

export type RiderStatus = 'pending' | 'active' | 'suspended' | 'inactive';
export type VehicleType = 'bicycle' | 'motorcycle' | 'car' | 'van' | 'walking';

export interface Rider {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  avatar_url: string | null;
  vehicle_type: VehicleType;
  vehicle_plate: string | null;
  license_number: string | null;
  license_expiry: string | null;
  status: RiderStatus;
  is_online: boolean;
  current_latitude: number | null;
  current_longitude: number | null;
  current_zone_id: string | null;
  current_zone_name: string | null;
  max_concurrent_orders: number;
  current_order_count: number;
  rating_average: number;
  total_deliveries: number;
  total_earnings: number;
  today_deliveries: number;
  today_earnings: number;
  acceptance_rate: number;
  on_time_rate: number;
  completion_rate: number;
  bank_account_info: { bank: string; account_number: string } | null;
  created_at: string;
  updated_at: string;
}

export interface RiderStats {
  total: number;
  active: number;
  pending: number;
  suspended: number;
  inactive: number;
  online: number;
  offline: number;
  by_vehicle_type: Record<VehicleType, number>;
  avg_rating: number;
  total_deliveries_today: number;
  total_earnings_today: number;
}

export interface RiderEarnings {
  rider_id: string;
  total_lifetime_earnings: number;
  total_lifetime_deliveries: number;
  today_earnings: number;
  today_deliveries: number;
  daily: { date: string; deliveries: number; earnings: number; tips: number }[];
}

interface RidersFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: RiderStatus | '';
  vehicle_type?: VehicleType | '';
  is_online?: 'true' | 'false' | '';
  zone?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

interface RidersResponse {
  success: boolean;
  data: Rider[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

interface RiderResponse {
  success: boolean;
  data: Rider;
}

interface StatsResponse {
  success: boolean;
  data: RiderStats;
}

interface EarningsResponse {
  success: boolean;
  data: RiderEarnings;
}

// ── Constants ────────────────────────────────────────────────────────────

export const RIDER_STATUS_LABELS: Record<RiderStatus, string> = {
  pending: 'Pending',
  active: 'Active',
  suspended: 'Suspended',
  inactive: 'Inactive',
};

export const RIDER_STATUS_COLORS: Record<RiderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  active: 'bg-green-100 text-green-800',
  suspended: 'bg-red-100 text-red-800',
  inactive: 'bg-gray-100 text-gray-800',
};

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  bicycle: 'Bicycle',
  motorcycle: 'Motorcycle',
  car: 'Car',
  van: 'Van',
  walking: 'Walking',
};

export const VEHICLE_TYPE_ICONS: Record<VehicleType, string> = {
  bicycle: '🚲',
  motorcycle: '🏍️',
  car: '🚗',
  van: '🚐',
  walking: '🚶',
};

// ── Query Hooks ──────────────────────────────────────────────────────────

export function useRiders(filters: RidersFilters = {}) {
  return useQuery({
    queryKey: ['admin', 'riders', { ...filters }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));
      if (filters.search) params.set('search', filters.search);
      if (filters.status) params.set('status', filters.status);
      if (filters.vehicle_type) params.set('vehicle_type', filters.vehicle_type);
      if (filters.is_online) params.set('is_online', filters.is_online);
      if (filters.zone) params.set('zone', filters.zone);
      if (filters.sort_by) params.set('sort_by', filters.sort_by);
      if (filters.sort_order) params.set('sort_order', filters.sort_order);
      const response = await api.get<RidersResponse>(`/admin/riders?${params}`);
      return response.data;
    },
  });
}

export function useRider(id: string) {
  return useQuery({
    queryKey: ['admin', 'riders', id],
    queryFn: async () => {
      const response = await api.get<RiderResponse>(`/admin/riders/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useRiderStats() {
  return useQuery({
    queryKey: ['admin', 'riders', 'stats'],
    queryFn: async () => {
      const response = await api.get<StatsResponse>('/admin/riders/stats');
      return response.data;
    },
  });
}

export function useRiderEarnings(id: string) {
  return useQuery({
    queryKey: ['admin', 'riders', id, 'earnings'],
    queryFn: async () => {
      const response = await api.get<EarningsResponse>(`/admin/riders/${id}/earnings`);
      return response.data;
    },
    enabled: !!id,
  });
}

// ── Mutation Hooks ───────────────────────────────────────────────────────

export function useUpdateRiderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: RiderStatus; reason?: string }) => {
      const response = await api.patch<RiderResponse>(`/admin/riders/${id}/status`, { status, reason });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'riders'] });
    },
  });
}

export function useApproveRider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<RiderResponse>(`/admin/riders/${id}/approve`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'riders'] });
    },
  });
}
