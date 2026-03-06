import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiResponse } from '@/lib/api';

// ── Types ─────────────────────────────────────────

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
  logoUrl: string | null;
  type: CarrierType;
  supportedServiceTypes: string[];
  isActive: boolean;
  priority: number;
  contactPhone: string | null;
  contactEmail: string | null;
  trackingUrlTemplate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CarrierService {
  id: string;
  carrierId: string;
  name: string;
  code: string;
  description: string | null;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  basePrice: number;
  perKgPrice: number;
  maxWeightKg: number;
  maxDimensions: Record<string, number> | null;
  isCodSupported: boolean;
  isInsuranceAvailable: boolean;
  coverageAreas: string[] | null;
  isActive: boolean;
  createdAt: string;
}

export interface ShippingRate {
  carrierId: string;
  carrierName: string;
  carrierCode: string;
  carrierLogoUrl: string | null;
  serviceId: string;
  serviceName: string;
  serviceCode: string;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  totalFee: number;
  basePrice: number;
  perKgPrice: number;
  isCodSupported: boolean;
  isInsuranceAvailable: boolean;
}

export interface Shipment {
  id: string;
  shipmentNumber: string;
  orderId: string;
  carrierId: string;
  carrierServiceId: string | null;
  storeId: string;
  status: ShipmentStatus;
  trackingNumber: string | null;
  carrierReference: string | null;
  weightKg: number | null;
  dimensions: Record<string, number> | null;
  packageCount: number;
  pickupAddress: Record<string, unknown>;
  deliveryAddress: Record<string, unknown>;
  estimatedPickupAt: string | null;
  actualPickupAt: string | null;
  estimatedDeliveryAt: string | null;
  actualDeliveryAt: string | null;
  shippingFee: number;
  insuranceAmount: number;
  codAmount: number;
  carrierStatus: string | null;
  labelUrl: string | null;
  labelFormat: string | null;
  notes: string | null;
  carrier?: ShippingCarrier;
  carrierService?: CarrierService;
  createdAt: string;
  updatedAt: string;
}

export interface TrackingEvent {
  status: string;
  timestamp: string;
  location: string;
  description: string;
}

export interface TrackingInfo {
  shipmentId: string;
  trackingNumber: string | null;
  carrierStatus: string | null;
  events: TrackingEvent[];
}

export interface ShipmentStats {
  total: number;
  pending: number;
  booked: number;
  inTransit: number;
  delivered: number;
  failed: number;
  cancelled: number;
  totalShippingFees: number;
  avgDeliveryDays: number;
}

export interface ShipmentFilters {
  status?: ShipmentStatus | 'all';
  carrierId?: string;
  page?: number;
  limit?: number;
}

export interface CreateShipmentData {
  orderId: string;
  carrierId: string;
  carrierServiceId?: string;
  storeId: string;
  weightKg?: number;
  dimensions?: Record<string, number>;
  packageCount?: number;
  pickupAddress: Record<string, unknown>;
  deliveryAddress: Record<string, unknown>;
  shippingFee?: number;
  insuranceAmount?: number;
  codAmount?: number;
  notes?: string;
}

export interface RateRequest {
  storeId: string;
  pickupAddress: Record<string, unknown>;
  deliveryAddress: Record<string, unknown>;
  weightKg?: number;
  dimensions?: Record<string, number>;
  codRequired?: boolean;
}

// ── Transform helpers ─────────────────────────────

function toCarrier(raw: Record<string, unknown>): ShippingCarrier {
  return {
    id: raw.id as string,
    name: raw.name as string,
    code: raw.code as string,
    logoUrl: (raw.logo_url ?? raw.logoUrl) as string | null,
    type: (raw.type as CarrierType),
    supportedServiceTypes: (raw.supported_service_types ?? raw.supportedServiceTypes) as string[],
    isActive: (raw.is_active ?? raw.isActive) as boolean,
    priority: raw.priority as number,
    contactPhone: (raw.contact_phone ?? raw.contactPhone) as string | null,
    contactEmail: (raw.contact_email ?? raw.contactEmail) as string | null,
    trackingUrlTemplate: (raw.tracking_url_template ?? raw.trackingUrlTemplate) as string | null,
    createdAt: (raw.created_at ?? raw.createdAt) as string,
    updatedAt: (raw.updated_at ?? raw.updatedAt) as string,
  };
}

function toService(raw: Record<string, unknown>): CarrierService {
  return {
    id: raw.id as string,
    carrierId: (raw.carrier_id ?? raw.carrierId) as string,
    name: raw.name as string,
    code: raw.code as string,
    description: raw.description as string | null,
    estimatedDaysMin: (raw.estimated_days_min ?? raw.estimatedDaysMin) as number,
    estimatedDaysMax: (raw.estimated_days_max ?? raw.estimatedDaysMax) as number,
    basePrice: (raw.base_price ?? raw.basePrice) as number,
    perKgPrice: (raw.per_kg_price ?? raw.perKgPrice) as number,
    maxWeightKg: (raw.max_weight_kg ?? raw.maxWeightKg) as number,
    maxDimensions: (raw.max_dimensions ?? raw.maxDimensions) as Record<string, number> | null,
    isCodSupported: (raw.is_cod_supported ?? raw.isCodSupported) as boolean,
    isInsuranceAvailable: (raw.is_insurance_available ?? raw.isInsuranceAvailable) as boolean,
    coverageAreas: (raw.coverage_areas ?? raw.coverageAreas) as string[] | null,
    isActive: (raw.is_active ?? raw.isActive) as boolean,
    createdAt: (raw.created_at ?? raw.createdAt) as string,
  };
}

function toShipment(raw: Record<string, unknown>): Shipment {
  return {
    id: raw.id as string,
    shipmentNumber: (raw.shipment_number ?? raw.shipmentNumber) as string,
    orderId: (raw.order_id ?? raw.orderId) as string,
    carrierId: (raw.carrier_id ?? raw.carrierId) as string,
    carrierServiceId: (raw.carrier_service_id ?? raw.carrierServiceId) as string | null,
    storeId: (raw.store_id ?? raw.storeId) as string,
    status: raw.status as ShipmentStatus,
    trackingNumber: (raw.tracking_number ?? raw.trackingNumber) as string | null,
    carrierReference: (raw.carrier_reference ?? raw.carrierReference) as string | null,
    weightKg: (raw.weight_kg ?? raw.weightKg) as number | null,
    dimensions: raw.dimensions as Record<string, number> | null,
    packageCount: (raw.package_count ?? raw.packageCount) as number,
    pickupAddress: (raw.pickup_address ?? raw.pickupAddress) as Record<string, unknown>,
    deliveryAddress: (raw.delivery_address ?? raw.deliveryAddress) as Record<string, unknown>,
    estimatedPickupAt: (raw.estimated_pickup_at ?? raw.estimatedPickupAt) as string | null,
    actualPickupAt: (raw.actual_pickup_at ?? raw.actualPickupAt) as string | null,
    estimatedDeliveryAt: (raw.estimated_delivery_at ?? raw.estimatedDeliveryAt) as string | null,
    actualDeliveryAt: (raw.actual_delivery_at ?? raw.actualDeliveryAt) as string | null,
    shippingFee: (raw.shipping_fee ?? raw.shippingFee) as number,
    insuranceAmount: (raw.insurance_amount ?? raw.insuranceAmount) as number,
    codAmount: (raw.cod_amount ?? raw.codAmount) as number,
    carrierStatus: (raw.carrier_status ?? raw.carrierStatus) as string | null,
    labelUrl: (raw.label_url ?? raw.labelUrl) as string | null,
    labelFormat: (raw.label_format ?? raw.labelFormat) as string | null,
    notes: raw.notes as string | null,
    carrier: raw.carrier ? toCarrier(raw.carrier as Record<string, unknown>) : undefined,
    carrierService: (raw.carrier_service ?? raw.carrierService) ? toService((raw.carrier_service ?? raw.carrierService) as Record<string, unknown>) : undefined,
    createdAt: (raw.created_at ?? raw.createdAt) as string,
    updatedAt: (raw.updated_at ?? raw.updatedAt) as string,
  };
}

function toRate(raw: Record<string, unknown>): ShippingRate {
  return {
    carrierId: (raw.carrier_id ?? raw.carrierId) as string,
    carrierName: (raw.carrier_name ?? raw.carrierName) as string,
    carrierCode: (raw.carrier_code ?? raw.carrierCode) as string,
    carrierLogoUrl: (raw.carrier_logo_url ?? raw.carrierLogoUrl) as string | null,
    serviceId: (raw.service_id ?? raw.serviceId) as string,
    serviceName: (raw.service_name ?? raw.serviceName) as string,
    serviceCode: (raw.service_code ?? raw.serviceCode) as string,
    estimatedDaysMin: (raw.estimated_days_min ?? raw.estimatedDaysMin) as number,
    estimatedDaysMax: (raw.estimated_days_max ?? raw.estimatedDaysMax) as number,
    totalFee: (raw.total_fee ?? raw.totalFee) as number,
    basePrice: (raw.base_price ?? raw.basePrice) as number,
    perKgPrice: (raw.per_kg_price ?? raw.perKgPrice) as number,
    isCodSupported: (raw.is_cod_supported ?? raw.isCodSupported) as boolean,
    isInsuranceAvailable: (raw.is_insurance_available ?? raw.isInsuranceAvailable) as boolean,
  };
}

function toStats(raw: Record<string, unknown>): ShipmentStats {
  return {
    total: raw.total as number,
    pending: raw.pending as number,
    booked: raw.booked as number,
    inTransit: (raw.in_transit ?? raw.inTransit) as number,
    delivered: raw.delivered as number,
    failed: raw.failed as number,
    cancelled: raw.cancelled as number,
    totalShippingFees: (raw.total_shipping_fees ?? raw.totalShippingFees) as number,
    avgDeliveryDays: (raw.avg_delivery_days ?? raw.avgDeliveryDays) as number,
  };
}

// ── Label & Color Constants ───────────────────────

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

// ── Query Hooks ───────────────────────────────────

export function useShippingCarriers() {
  return useQuery({
    queryKey: ['shipping-carriers'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Record<string, unknown>[]>>('/shipping/carriers');
      return (res.data.data || []).map(toCarrier);
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCarrierServices(carrierId: string | null) {
  return useQuery({
    queryKey: ['carrier-services', carrierId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Record<string, unknown>[]>>(`/shipping/carriers/${carrierId}/services`);
      return (res.data.data || []).map(toService);
    },
    enabled: !!carrierId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useShipments(filters: ShipmentFilters = {}) {
  return useQuery({
    queryKey: ['vendor-shipments', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status && filters.status !== 'all') params.set('status', filters.status);
      if (filters.carrierId) params.set('carrier_id', filters.carrierId);
      params.set('page', String(filters.page || 1));
      params.set('limit', String(filters.limit || 20));

      const res = await api.get<ApiResponse<Record<string, unknown>[]>>(`/shipping/shipments?${params}`);
      return {
        data: (res.data.data || []).map(toShipment),
        meta: res.data.meta,
      };
    },
    refetchInterval: 30000,
  });
}

export function useShipment(id: string | null) {
  return useQuery({
    queryKey: ['vendor-shipment', id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Record<string, unknown>>>(`/shipping/shipments/${id}`);
      return toShipment(res.data.data);
    },
    enabled: !!id,
  });
}

export function useShipmentTracking(id: string | null) {
  return useQuery({
    queryKey: ['shipment-tracking', id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<TrackingInfo>>(`/shipping/shipments/${id}/track`);
      return res.data.data;
    },
    enabled: !!id,
    refetchInterval: 30000,
  });
}

export function useShipmentStats() {
  return useQuery({
    queryKey: ['vendor-shipment-stats'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Record<string, unknown>>>('/shipping/shipments/stats/summary');
      return toStats(res.data.data);
    },
  });
}

// ── Mutation Hooks ────────────────────────────────

export function useGetShippingRates() {
  return useMutation({
    mutationFn: async (data: RateRequest) => {
      const payload = {
        store_id: data.storeId,
        pickup_address: data.pickupAddress,
        delivery_address: data.deliveryAddress,
        weight_kg: data.weightKg,
        dimensions: data.dimensions,
        cod_required: data.codRequired,
      };
      const res = await api.post<ApiResponse<Record<string, unknown>[]>>('/shipping/rates', payload);
      return (res.data.data || []).map(toRate);
    },
  });
}

export function useCreateShipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateShipmentData) => {
      const payload = {
        order_id: data.orderId,
        carrier_id: data.carrierId,
        carrier_service_id: data.carrierServiceId,
        store_id: data.storeId,
        weight_kg: data.weightKg,
        dimensions: data.dimensions,
        package_count: data.packageCount,
        pickup_address: data.pickupAddress,
        delivery_address: data.deliveryAddress,
        shipping_fee: data.shippingFee,
        insurance_amount: data.insuranceAmount,
        cod_amount: data.codAmount,
        notes: data.notes,
      };
      const res = await api.post<ApiResponse<Record<string, unknown>>>('/shipping/shipments', payload);
      return toShipment(res.data.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendor-shipments'] });
      qc.invalidateQueries({ queryKey: ['vendor-shipment-stats'] });
    },
  });
}

export function useBookShipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<ApiResponse<Record<string, unknown>>>(`/shipping/shipments/${id}/book`);
      return toShipment(res.data.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendor-shipments'] });
      qc.invalidateQueries({ queryKey: ['vendor-shipment'] });
      qc.invalidateQueries({ queryKey: ['vendor-shipment-stats'] });
    },
  });
}

export function useGenerateLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<ApiResponse<Record<string, unknown>>>(`/shipping/shipments/${id}/label`);
      return toShipment(res.data.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendor-shipments'] });
      qc.invalidateQueries({ queryKey: ['vendor-shipment'] });
    },
  });
}

export function useUpdateShipmentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: ShipmentStatus; notes?: string }) => {
      const res = await api.patch<ApiResponse<Record<string, unknown>>>(`/shipping/shipments/${id}/status`, { status, notes });
      return toShipment(res.data.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendor-shipments'] });
      qc.invalidateQueries({ queryKey: ['vendor-shipment'] });
      qc.invalidateQueries({ queryKey: ['vendor-shipment-stats'] });
    },
  });
}

export function useCancelShipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const res = await api.post<ApiResponse<Record<string, unknown>>>(`/shipping/shipments/${id}/cancel`, { reason });
      return toShipment(res.data.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendor-shipments'] });
      qc.invalidateQueries({ queryKey: ['vendor-shipment'] });
      qc.invalidateQueries({ queryKey: ['vendor-shipment-stats'] });
    },
  });
}
