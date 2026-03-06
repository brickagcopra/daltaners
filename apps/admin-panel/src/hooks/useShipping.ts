import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ── Types (snake_case for admin panel) ────────────

export type ShipmentStatus =
  | 'pending'
  | 'booked'
  | 'label_generated'
  | 'picked_up'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed'
  | 'returned_to_sender'
  | 'cancelled';

export type CarrierType = 'third_party' | 'platform';

export interface ShippingCarrier {
  id: string;
  name: string;
  code: string;
  logo_url: string | null;
  type: CarrierType;
  api_base_url: string | null;
  supported_service_types: string[];
  is_active: boolean;
  priority: number;
  contact_phone: string | null;
  contact_email: string | null;
  tracking_url_template: string | null;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CarrierService {
  id: string;
  carrier_id: string;
  name: string;
  code: string;
  description: string | null;
  estimated_days_min: number;
  estimated_days_max: number;
  base_price: number;
  per_kg_price: number;
  max_weight_kg: number;
  max_dimensions: Record<string, number> | null;
  is_cod_supported: boolean;
  is_insurance_available: boolean;
  coverage_areas: string[] | null;
  is_active: boolean;
  created_at: string;
}

export interface Shipment {
  id: string;
  shipment_number: string;
  order_id: string;
  carrier_id: string;
  carrier_service_id: string | null;
  store_id: string;
  status: ShipmentStatus;
  tracking_number: string | null;
  carrier_reference: string | null;
  weight_kg: number | null;
  dimensions: Record<string, number> | null;
  package_count: number;
  pickup_address: Record<string, unknown>;
  delivery_address: Record<string, unknown>;
  estimated_pickup_at: string | null;
  actual_pickup_at: string | null;
  estimated_delivery_at: string | null;
  actual_delivery_at: string | null;
  shipping_fee: number;
  insurance_amount: number;
  cod_amount: number;
  carrier_status: string | null;
  label_url: string | null;
  label_format: string | null;
  notes: string | null;
  carrier?: ShippingCarrier;
  carrier_service?: CarrierService;
  created_at: string;
  updated_at: string;
}

export interface ShipmentStats {
  total: number;
  pending: number;
  booked: number;
  in_transit: number;
  delivered: number;
  failed: number;
  cancelled: number;
  total_shipping_fees: number;
  avg_delivery_days: number;
}

export interface CarrierFilters {
  search?: string;
  type?: CarrierType;
  is_active?: boolean | '';
  page?: number;
  limit?: number;
}

export interface ShipmentFilters {
  search?: string;
  status?: ShipmentStatus | 'all';
  carrier_id?: string;
  store_id?: string;
  order_id?: string;
  date_from?: string;
  date_to?: string;
  sort_by?: string;
  sort_order?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
}

export interface CreateCarrierData {
  name: string;
  code: string;
  logo_url?: string;
  type: CarrierType;
  api_base_url?: string;
  supported_service_types?: string[];
  is_active?: boolean;
  priority?: number;
  contact_phone?: string;
  contact_email?: string;
  tracking_url_template?: string;
  settings?: Record<string, unknown>;
}

export interface CreateCarrierServiceData {
  carrier_id: string;
  name: string;
  code: string;
  description?: string;
  estimated_days_min?: number;
  estimated_days_max?: number;
  base_price: number;
  per_kg_price?: number;
  max_weight_kg?: number;
  is_cod_supported?: boolean;
  is_insurance_available?: boolean;
  coverage_areas?: string[];
  is_active?: boolean;
}

// ── Labels & Colors ───────────────────────────────

export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  pending: 'Pending',
  booked: 'Booked',
  label_generated: 'Label Ready',
  picked_up: 'Picked Up',
  in_transit: 'In Transit',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  failed: 'Failed',
  returned_to_sender: 'Returned',
  cancelled: 'Cancelled',
};

export const SHIPMENT_STATUS_COLORS: Record<ShipmentStatus, string> = {
  pending: 'bg-gray-100 text-gray-800',
  booked: 'bg-blue-100 text-blue-800',
  label_generated: 'bg-indigo-100 text-indigo-800',
  picked_up: 'bg-cyan-100 text-cyan-800',
  in_transit: 'bg-yellow-100 text-yellow-800',
  out_for_delivery: 'bg-orange-100 text-orange-800',
  delivered: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  returned_to_sender: 'bg-pink-100 text-pink-800',
  cancelled: 'bg-gray-200 text-gray-600',
};

export const CARRIER_TYPE_LABELS: Record<CarrierType, string> = {
  third_party: 'Third Party',
  platform: 'Platform',
};

// ── Carrier Query Hooks ───────────────────────────

export function useAdminCarriers(filters: CarrierFilters = {}) {
  return useQuery({
    queryKey: ['admin', 'carriers', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.type) params.set('type', filters.type);
      if (filters.is_active !== '' && filters.is_active !== undefined) params.set('is_active', String(filters.is_active));
      params.set('page', String(filters.page || 1));
      params.set('limit', String(filters.limit || 20));

      const res = await api.get(`/admin/shipping/carriers?${params}`);
      return res.data as { success: boolean; data: ShippingCarrier[]; meta: { page: number; limit: number; total: number; totalPages: number } };
    },
  });
}

export function useAdminCarrier(id: string | null) {
  return useQuery({
    queryKey: ['admin', 'carrier', id],
    queryFn: async () => {
      const res = await api.get(`/admin/shipping/carriers/${id}`);
      return res.data.data as ShippingCarrier;
    },
    enabled: !!id,
  });
}

export function useAdminCarrierServices(carrierId: string | null) {
  return useQuery({
    queryKey: ['admin', 'carrier-services', carrierId],
    queryFn: async () => {
      const res = await api.get(`/admin/shipping/carriers/${carrierId}/services`);
      return (res.data.data || []) as CarrierService[];
    },
    enabled: !!carrierId,
  });
}

// ── Shipment Query Hooks ──────────────────────────

export function useAdminShipments(filters: ShipmentFilters = {}) {
  return useQuery({
    queryKey: ['admin', 'shipments', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.status && filters.status !== 'all') params.set('status', filters.status);
      if (filters.carrier_id) params.set('carrier_id', filters.carrier_id);
      if (filters.store_id) params.set('store_id', filters.store_id);
      if (filters.order_id) params.set('order_id', filters.order_id);
      if (filters.date_from) params.set('date_from', filters.date_from);
      if (filters.date_to) params.set('date_to', filters.date_to);
      if (filters.sort_by) params.set('sort_by', filters.sort_by);
      if (filters.sort_order) params.set('sort_order', filters.sort_order);
      params.set('page', String(filters.page || 1));
      params.set('limit', String(filters.limit || 20));

      const res = await api.get(`/admin/shipping/shipments?${params}`);
      return res.data as { success: boolean; data: Shipment[]; meta: { page: number; limit: number; total: number; totalPages: number } };
    },
    refetchInterval: 30000,
  });
}

export function useAdminShipment(id: string | null) {
  return useQuery({
    queryKey: ['admin', 'shipment', id],
    queryFn: async () => {
      const res = await api.get(`/admin/shipping/shipments/${id}`);
      return res.data.data as Shipment;
    },
    enabled: !!id,
  });
}

export function useAdminShipmentStats() {
  return useQuery({
    queryKey: ['admin', 'shipment-stats'],
    queryFn: async () => {
      const res = await api.get('/admin/shipping/shipments/stats');
      return res.data.data as ShipmentStats;
    },
  });
}

// ── Carrier Mutation Hooks ────────────────────────

export function useCreateCarrier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateCarrierData) => {
      const res = await api.post('/admin/shipping/carriers', data);
      return res.data.data as ShippingCarrier;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'carriers'] });
    },
  });
}

export function useUpdateCarrier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateCarrierData> }) => {
      const res = await api.patch(`/admin/shipping/carriers/${id}`, data);
      return res.data.data as ShippingCarrier;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'carriers'] });
      qc.invalidateQueries({ queryKey: ['admin', 'carrier'] });
    },
  });
}

export function useDeleteCarrier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/shipping/carriers/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'carriers'] });
    },
  });
}

// ── Carrier Service Mutation Hooks ────────────────

export function useCreateCarrierService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateCarrierServiceData) => {
      const res = await api.post('/admin/shipping/services', data);
      return res.data.data as CarrierService;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'carrier-services'] });
    },
  });
}

export function useUpdateCarrierService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateCarrierServiceData> }) => {
      const res = await api.patch(`/admin/shipping/services/${id}`, data);
      return res.data.data as CarrierService;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'carrier-services'] });
    },
  });
}

export function useDeleteCarrierService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/shipping/services/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'carrier-services'] });
    },
  });
}

// ── Shipment Mutation Hooks ───────────────────────

export function useAdminUpdateShipmentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: ShipmentStatus; notes?: string }) => {
      const res = await api.patch(`/admin/shipping/shipments/${id}/status`, { status, notes });
      return res.data.data as Shipment;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'shipments'] });
      qc.invalidateQueries({ queryKey: ['admin', 'shipment'] });
      qc.invalidateQueries({ queryKey: ['admin', 'shipment-stats'] });
    },
  });
}
