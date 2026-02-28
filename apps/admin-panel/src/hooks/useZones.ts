import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface Zone {
  id: string;
  name: string;
  city: string;
  province: string;
  deliveryFee: number;
  minimumOrderAmount: number;
  isActive: boolean;
  estimatedDeliveryMinutes: number;
  createdAt: string;
  updatedAt: string;
}

interface ZonesResponse {
  success: boolean;
  data: Zone[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ZoneResponse {
  success: boolean;
  data: Zone;
}

interface CreateZonePayload {
  name: string;
  city: string;
  province: string;
  deliveryFee: number;
  minimumOrderAmount: number;
  isActive: boolean;
  estimatedDeliveryMinutes: number;
}

export function useZones(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['admin', 'zones', { page, limit }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));

      const response = await api.get<ZonesResponse>(`/admin/zones?${params.toString()}`);
      return response.data;
    },
  });
}

export function useCreateZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateZonePayload) => {
      const response = await api.post<ZoneResponse>('/admin/zones', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'zones'] });
    },
  });
}

export function useUpdateZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateZonePayload> }) => {
      const response = await api.patch<ZoneResponse>(`/admin/zones/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'zones'] });
    },
  });
}
