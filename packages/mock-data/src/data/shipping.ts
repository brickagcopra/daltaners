// Shipping & Carrier mock data

export type CarrierType = 'third_party' | 'platform';

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

export interface MockShippingCarrier {
  id: string;
  name: string;
  code: string;
  logo_url: string | null;
  type: CarrierType;
  api_base_url: string | null;
  api_credentials: Record<string, unknown>;
  supported_service_types: string[];
  is_active: boolean;
  priority: number;
  contact_phone: string | null;
  contact_email: string | null;
  webhook_secret: string | null;
  tracking_url_template: string | null;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface MockCarrierService {
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

export interface MockShipment {
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
  carrier_response: Record<string, unknown> | null;
  label_url: string | null;
  label_format: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Joined fields for display
  carrier?: MockShippingCarrier;
  carrier_service?: MockCarrierService;
}

export interface MockShipmentStats {
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

// ── Carriers ──────────────────────────────────────────

export const shippingCarriers: MockShippingCarrier[] = [
  {
    id: 'car-001',
    name: 'J&T Express Philippines',
    code: 'jnt',
    logo_url: 'https://cdn.daltaners.ph/carriers/jnt-logo.png',
    type: 'third_party',
    api_base_url: 'https://api.jtexpress.ph/v1',
    api_credentials: {},
    supported_service_types: ['grocery', 'parcel'],
    is_active: true,
    priority: 10,
    contact_phone: '+63 2 8888 1234',
    contact_email: 'partner@jtexpress.ph',
    webhook_secret: null,
    tracking_url_template: 'https://jtexpress.ph/track?billcode={{tracking_number}}',
    settings: { max_concurrent_bookings: 100 },
    created_at: '2026-01-15T08:00:00.000Z',
    updated_at: '2026-02-20T10:30:00.000Z',
  },
  {
    id: 'car-002',
    name: 'LBC Express',
    code: 'lbc',
    logo_url: 'https://cdn.daltaners.ph/carriers/lbc-logo.png',
    type: 'third_party',
    api_base_url: 'https://api.lbcexpress.com/v2',
    api_credentials: {},
    supported_service_types: ['grocery', 'parcel', 'pharmacy'],
    is_active: true,
    priority: 8,
    contact_phone: '+63 2 8585 9999',
    contact_email: 'digital@lbcexpress.com',
    webhook_secret: null,
    tracking_url_template: 'https://lbcexpress.com/track?tn={{tracking_number}}',
    settings: {},
    created_at: '2026-01-15T08:00:00.000Z',
    updated_at: '2026-02-18T14:00:00.000Z',
  },
  {
    id: 'car-003',
    name: 'Ninja Van Philippines',
    code: 'ninjavan',
    logo_url: 'https://cdn.daltaners.ph/carriers/ninjavan-logo.png',
    type: 'third_party',
    api_base_url: 'https://api.ninjavan.co/ph/v2',
    api_credentials: {},
    supported_service_types: ['parcel'],
    is_active: true,
    priority: 7,
    contact_phone: '+63 2 7777 8888',
    contact_email: 'support@ninjavan.co',
    webhook_secret: null,
    tracking_url_template: 'https://ninjavan.co/ph/track?id={{tracking_number}}',
    settings: {},
    created_at: '2026-01-20T08:00:00.000Z',
    updated_at: '2026-02-25T09:15:00.000Z',
  },
  {
    id: 'car-004',
    name: 'Daltaners Riders',
    code: 'daltaners',
    logo_url: 'https://cdn.daltaners.ph/carriers/daltaners-logo.png',
    type: 'platform',
    api_base_url: null,
    api_credentials: {},
    supported_service_types: ['grocery', 'food', 'pharmacy', 'parcel'],
    is_active: true,
    priority: 15,
    contact_phone: null,
    contact_email: 'riders@daltaners.ph',
    webhook_secret: null,
    tracking_url_template: null,
    settings: { max_concurrent_orders: 3 },
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-03-01T12:00:00.000Z',
  },
  {
    id: 'car-005',
    name: 'Flash Express PH',
    code: 'flash',
    logo_url: 'https://cdn.daltaners.ph/carriers/flash-logo.png',
    type: 'third_party',
    api_base_url: 'https://api.flashexpress.ph/v1',
    api_credentials: {},
    supported_service_types: ['parcel'],
    is_active: false,
    priority: 3,
    contact_phone: '+63 2 6666 0000',
    contact_email: 'partners@flashexpress.ph',
    webhook_secret: null,
    tracking_url_template: 'https://flashexpress.ph/track/{{tracking_number}}',
    settings: {},
    created_at: '2026-02-01T08:00:00.000Z',
    updated_at: '2026-02-28T16:00:00.000Z',
  },
];

// ── Carrier Services ──────────────────────────────────

export const carrierServices: MockCarrierService[] = [
  // J&T Express services
  {
    id: 'svc-001',
    carrier_id: 'car-001',
    name: 'J&T Standard',
    code: 'standard',
    description: 'Standard delivery within 3-5 business days',
    estimated_days_min: 3,
    estimated_days_max: 5,
    base_price: 85,
    per_kg_price: 15,
    max_weight_kg: 50,
    max_dimensions: { length_cm: 120, width_cm: 80, height_cm: 80 },
    is_cod_supported: true,
    is_insurance_available: true,
    coverage_areas: ['Metro Manila', 'Luzon', 'Visayas', 'Mindanao'],
    is_active: true,
    created_at: '2026-01-15T08:00:00.000Z',
  },
  {
    id: 'svc-002',
    carrier_id: 'car-001',
    name: 'J&T Express',
    code: 'express',
    description: 'Express delivery within 1-2 business days',
    estimated_days_min: 1,
    estimated_days_max: 2,
    base_price: 150,
    per_kg_price: 25,
    max_weight_kg: 30,
    max_dimensions: { length_cm: 80, width_cm: 60, height_cm: 60 },
    is_cod_supported: true,
    is_insurance_available: true,
    coverage_areas: ['Metro Manila', 'Central Luzon', 'Calabarzon'],
    is_active: true,
    created_at: '2026-01-15T08:00:00.000Z',
  },
  // LBC Express services
  {
    id: 'svc-003',
    carrier_id: 'car-002',
    name: 'LBC Same Day',
    code: 'same_day',
    description: 'Same-day delivery within Metro Manila',
    estimated_days_min: 0,
    estimated_days_max: 1,
    base_price: 250,
    per_kg_price: 30,
    max_weight_kg: 20,
    max_dimensions: { length_cm: 60, width_cm: 50, height_cm: 50 },
    is_cod_supported: true,
    is_insurance_available: true,
    coverage_areas: ['Metro Manila'],
    is_active: true,
    created_at: '2026-01-15T08:00:00.000Z',
  },
  {
    id: 'svc-004',
    carrier_id: 'car-002',
    name: 'LBC Regular',
    code: 'regular',
    description: 'Regular delivery within 2-4 business days',
    estimated_days_min: 2,
    estimated_days_max: 4,
    base_price: 95,
    per_kg_price: 18,
    max_weight_kg: 50,
    max_dimensions: { length_cm: 120, width_cm: 80, height_cm: 80 },
    is_cod_supported: true,
    is_insurance_available: true,
    coverage_areas: ['Metro Manila', 'Luzon', 'Visayas', 'Mindanao'],
    is_active: true,
    created_at: '2026-01-15T08:00:00.000Z',
  },
  // Ninja Van services
  {
    id: 'svc-005',
    carrier_id: 'car-003',
    name: 'Ninja Standard',
    code: 'standard',
    description: 'Standard parcel delivery 3-5 business days',
    estimated_days_min: 3,
    estimated_days_max: 5,
    base_price: 80,
    per_kg_price: 12,
    max_weight_kg: 50,
    max_dimensions: { length_cm: 120, width_cm: 80, height_cm: 80 },
    is_cod_supported: true,
    is_insurance_available: false,
    coverage_areas: ['Metro Manila', 'Luzon', 'Visayas', 'Mindanao'],
    is_active: true,
    created_at: '2026-01-20T08:00:00.000Z',
  },
  // Daltaners platform services
  {
    id: 'svc-006',
    carrier_id: 'car-004',
    name: 'Daltaners Express',
    code: 'express',
    description: 'Express delivery by Daltaners riders within 2-4 hours',
    estimated_days_min: 0,
    estimated_days_max: 1,
    base_price: 99,
    per_kg_price: 10,
    max_weight_kg: 15,
    max_dimensions: { length_cm: 50, width_cm: 40, height_cm: 40 },
    is_cod_supported: true,
    is_insurance_available: false,
    coverage_areas: ['Metro Manila', 'Cebu City', 'Davao City'],
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'svc-007',
    carrier_id: 'car-004',
    name: 'Daltaners Standard',
    code: 'standard',
    description: 'Standard same-day or next-day delivery by Daltaners riders',
    estimated_days_min: 0,
    estimated_days_max: 1,
    base_price: 49,
    per_kg_price: 5,
    max_weight_kg: 20,
    max_dimensions: { length_cm: 60, width_cm: 50, height_cm: 50 },
    is_cod_supported: true,
    is_insurance_available: false,
    coverage_areas: ['Metro Manila', 'Cebu City', 'Davao City'],
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
];

// ── Shipments ─────────────────────────────────────────

const STORE_IDS = [
  'store-001-uuid',
  'store-002-uuid',
  'store-003-uuid',
];

const ORDER_IDS = [
  'order-aaa-001',
  'order-aaa-002',
  'order-aaa-003',
  'order-aaa-004',
  'order-aaa-005',
  'order-aaa-006',
  'order-aaa-007',
  'order-aaa-008',
  'order-aaa-009',
  'order-aaa-010',
];

export const shipments: MockShipment[] = [
  {
    id: 'shp-001',
    shipment_number: 'SHP-20260301-001',
    order_id: ORDER_IDS[0],
    carrier_id: 'car-004',
    carrier_service_id: 'svc-006',
    store_id: STORE_IDS[0],
    status: 'delivered',
    tracking_number: 'DLT-2026030100001',
    carrier_reference: null,
    weight_kg: 3.5,
    dimensions: { length_cm: 30, width_cm: 25, height_cm: 15 },
    package_count: 1,
    pickup_address: { address_line1: '123 Rizal Ave', city: 'Manila', province: 'Metro Manila', latitude: 14.5995, longitude: 120.9842 },
    delivery_address: { address_line1: '456 Mabini St', city: 'Makati', province: 'Metro Manila', latitude: 14.5547, longitude: 121.0244 },
    estimated_pickup_at: '2026-03-01T09:00:00.000Z',
    actual_pickup_at: '2026-03-01T09:15:00.000Z',
    estimated_delivery_at: '2026-03-01T12:00:00.000Z',
    actual_delivery_at: '2026-03-01T11:45:00.000Z',
    shipping_fee: 99,
    insurance_amount: 0,
    cod_amount: 0,
    carrier_status: 'delivered',
    carrier_response: null,
    label_url: 'https://cdn.daltaners.ph/labels/shp-001.pdf',
    label_format: 'pdf',
    notes: null,
    metadata: {},
    created_at: '2026-03-01T08:30:00.000Z',
    updated_at: '2026-03-01T11:45:00.000Z',
  },
  {
    id: 'shp-002',
    shipment_number: 'SHP-20260301-002',
    order_id: ORDER_IDS[1],
    carrier_id: 'car-001',
    carrier_service_id: 'svc-002',
    store_id: STORE_IDS[0],
    status: 'in_transit',
    tracking_number: 'JNT9876543210',
    carrier_reference: 'JNT-REF-98765',
    weight_kg: 5.0,
    dimensions: { length_cm: 40, width_cm: 30, height_cm: 20 },
    package_count: 1,
    pickup_address: { address_line1: '123 Rizal Ave', city: 'Manila', province: 'Metro Manila', latitude: 14.5995, longitude: 120.9842 },
    delivery_address: { address_line1: '789 Quezon Blvd', city: 'Quezon City', province: 'Metro Manila', latitude: 14.6326, longitude: 121.0277 },
    estimated_pickup_at: '2026-03-01T10:00:00.000Z',
    actual_pickup_at: '2026-03-01T10:30:00.000Z',
    estimated_delivery_at: '2026-03-02T18:00:00.000Z',
    actual_delivery_at: null,
    shipping_fee: 150,
    insurance_amount: 50,
    cod_amount: 0,
    carrier_status: 'in_transit',
    carrier_response: { scan_location: 'Manila Hub', last_scan: '2026-03-01T14:00:00Z' },
    label_url: 'https://cdn.daltaners.ph/labels/shp-002.pdf',
    label_format: 'pdf',
    notes: null,
    metadata: {},
    created_at: '2026-03-01T09:00:00.000Z',
    updated_at: '2026-03-01T14:00:00.000Z',
  },
  {
    id: 'shp-003',
    shipment_number: 'SHP-20260302-001',
    order_id: ORDER_IDS[2],
    carrier_id: 'car-002',
    carrier_service_id: 'svc-003',
    store_id: STORE_IDS[1],
    status: 'out_for_delivery',
    tracking_number: 'LBC2026030200001',
    carrier_reference: 'LBC-R-20260302',
    weight_kg: 2.0,
    dimensions: { length_cm: 25, width_cm: 20, height_cm: 15 },
    package_count: 1,
    pickup_address: { address_line1: '55 Ayala Ave', city: 'Makati', province: 'Metro Manila', latitude: 14.5547, longitude: 121.0244 },
    delivery_address: { address_line1: '12 Taft Ave', city: 'Pasay', province: 'Metro Manila', latitude: 14.5378, longitude: 120.9983 },
    estimated_pickup_at: '2026-03-02T08:00:00.000Z',
    actual_pickup_at: '2026-03-02T08:20:00.000Z',
    estimated_delivery_at: '2026-03-02T14:00:00.000Z',
    actual_delivery_at: null,
    shipping_fee: 250,
    insurance_amount: 25,
    cod_amount: 1500,
    carrier_status: 'out_for_delivery',
    carrier_response: null,
    label_url: 'https://cdn.daltaners.ph/labels/shp-003.pdf',
    label_format: 'pdf',
    notes: 'COD order — collect PHP 1,500',
    metadata: {},
    created_at: '2026-03-02T07:30:00.000Z',
    updated_at: '2026-03-02T12:00:00.000Z',
  },
  {
    id: 'shp-004',
    shipment_number: 'SHP-20260302-002',
    order_id: ORDER_IDS[3],
    carrier_id: 'car-004',
    carrier_service_id: 'svc-007',
    store_id: STORE_IDS[0],
    status: 'pending',
    tracking_number: null,
    carrier_reference: null,
    weight_kg: 8.0,
    dimensions: { length_cm: 50, width_cm: 40, height_cm: 30 },
    package_count: 2,
    pickup_address: { address_line1: '123 Rizal Ave', city: 'Manila', province: 'Metro Manila', latitude: 14.5995, longitude: 120.9842 },
    delivery_address: { address_line1: '90 Shaw Blvd', city: 'Mandaluyong', province: 'Metro Manila', latitude: 14.5794, longitude: 121.0359 },
    estimated_pickup_at: null,
    actual_pickup_at: null,
    estimated_delivery_at: null,
    actual_delivery_at: null,
    shipping_fee: 49,
    insurance_amount: 0,
    cod_amount: 0,
    carrier_status: null,
    carrier_response: null,
    label_url: null,
    label_format: null,
    notes: 'Bulk grocery order — 2 bags',
    metadata: {},
    created_at: '2026-03-02T10:00:00.000Z',
    updated_at: '2026-03-02T10:00:00.000Z',
  },
  {
    id: 'shp-005',
    shipment_number: 'SHP-20260302-003',
    order_id: ORDER_IDS[4],
    carrier_id: 'car-003',
    carrier_service_id: 'svc-005',
    store_id: STORE_IDS[2],
    status: 'booked',
    tracking_number: 'NV2026030200005',
    carrier_reference: 'NV-PH-00005',
    weight_kg: 1.5,
    dimensions: { length_cm: 20, width_cm: 15, height_cm: 10 },
    package_count: 1,
    pickup_address: { address_line1: '10 Osmeña Ave', city: 'Cebu City', province: 'Cebu', latitude: 10.3157, longitude: 123.8854 },
    delivery_address: { address_line1: '22 Fuente Circle', city: 'Cebu City', province: 'Cebu', latitude: 10.3096, longitude: 123.8927 },
    estimated_pickup_at: '2026-03-03T08:00:00.000Z',
    actual_pickup_at: null,
    estimated_delivery_at: '2026-03-05T18:00:00.000Z',
    actual_delivery_at: null,
    shipping_fee: 80,
    insurance_amount: 0,
    cod_amount: 750,
    carrier_status: 'booked',
    carrier_response: { booking_ref: 'NV-PH-00005' },
    label_url: null,
    label_format: null,
    notes: null,
    metadata: {},
    created_at: '2026-03-02T14:00:00.000Z',
    updated_at: '2026-03-02T14:30:00.000Z',
  },
  {
    id: 'shp-006',
    shipment_number: 'SHP-20260228-001',
    order_id: ORDER_IDS[5],
    carrier_id: 'car-001',
    carrier_service_id: 'svc-001',
    store_id: STORE_IDS[1],
    status: 'failed',
    tracking_number: 'JNT1111222233',
    carrier_reference: 'JNT-REF-11112',
    weight_kg: 4.0,
    dimensions: { length_cm: 35, width_cm: 25, height_cm: 20 },
    package_count: 1,
    pickup_address: { address_line1: '55 Ayala Ave', city: 'Makati', province: 'Metro Manila', latitude: 14.5547, longitude: 121.0244 },
    delivery_address: { address_line1: '300 EDSA', city: 'Mandaluyong', province: 'Metro Manila', latitude: 14.5794, longitude: 121.0359 },
    estimated_pickup_at: '2026-02-28T09:00:00.000Z',
    actual_pickup_at: '2026-02-28T09:30:00.000Z',
    estimated_delivery_at: '2026-03-02T18:00:00.000Z',
    actual_delivery_at: null,
    shipping_fee: 85,
    insurance_amount: 0,
    cod_amount: 0,
    carrier_status: 'delivery_failed',
    carrier_response: { reason: 'Customer not available', attempts: 3 },
    label_url: 'https://cdn.daltaners.ph/labels/shp-006.pdf',
    label_format: 'pdf',
    notes: 'Failed after 3 delivery attempts — customer unreachable',
    metadata: {},
    created_at: '2026-02-28T08:00:00.000Z',
    updated_at: '2026-03-02T16:00:00.000Z',
  },
  {
    id: 'shp-007',
    shipment_number: 'SHP-20260301-003',
    order_id: ORDER_IDS[6],
    carrier_id: 'car-004',
    carrier_service_id: 'svc-006',
    store_id: STORE_IDS[2],
    status: 'cancelled',
    tracking_number: null,
    carrier_reference: null,
    weight_kg: 1.0,
    dimensions: null,
    package_count: 1,
    pickup_address: { address_line1: '10 Osmeña Ave', city: 'Cebu City', province: 'Cebu', latitude: 10.3157, longitude: 123.8854 },
    delivery_address: { address_line1: '5 Mango Ave', city: 'Cebu City', province: 'Cebu', latitude: 10.3098, longitude: 123.8917 },
    estimated_pickup_at: null,
    actual_pickup_at: null,
    estimated_delivery_at: null,
    actual_delivery_at: null,
    shipping_fee: 99,
    insurance_amount: 0,
    cod_amount: 0,
    carrier_status: null,
    carrier_response: null,
    label_url: null,
    label_format: null,
    notes: 'Order cancelled by customer',
    metadata: {},
    created_at: '2026-03-01T11:00:00.000Z',
    updated_at: '2026-03-01T11:30:00.000Z',
  },
  {
    id: 'shp-008',
    shipment_number: 'SHP-20260302-004',
    order_id: ORDER_IDS[7],
    carrier_id: 'car-002',
    carrier_service_id: 'svc-004',
    store_id: STORE_IDS[0],
    status: 'label_generated',
    tracking_number: 'LBC2026030200008',
    carrier_reference: 'LBC-R-20260302-B',
    weight_kg: 6.5,
    dimensions: { length_cm: 45, width_cm: 35, height_cm: 25 },
    package_count: 1,
    pickup_address: { address_line1: '123 Rizal Ave', city: 'Manila', province: 'Metro Manila', latitude: 14.5995, longitude: 120.9842 },
    delivery_address: { address_line1: '200 Aurora Blvd', city: 'Quezon City', province: 'Metro Manila', latitude: 14.6198, longitude: 121.0508 },
    estimated_pickup_at: '2026-03-03T09:00:00.000Z',
    actual_pickup_at: null,
    estimated_delivery_at: '2026-03-05T18:00:00.000Z',
    actual_delivery_at: null,
    shipping_fee: 95,
    insurance_amount: 30,
    cod_amount: 0,
    carrier_status: 'label_ready',
    carrier_response: null,
    label_url: 'https://cdn.daltaners.ph/labels/shp-008.pdf',
    label_format: 'pdf',
    notes: null,
    metadata: {},
    created_at: '2026-03-02T16:00:00.000Z',
    updated_at: '2026-03-02T16:30:00.000Z',
  },
  {
    id: 'shp-009',
    shipment_number: 'SHP-20260228-002',
    order_id: ORDER_IDS[8],
    carrier_id: 'car-001',
    carrier_service_id: 'svc-002',
    store_id: STORE_IDS[1],
    status: 'returned_to_sender',
    tracking_number: 'JNT4444555566',
    carrier_reference: 'JNT-REF-44445',
    weight_kg: 2.5,
    dimensions: { length_cm: 25, width_cm: 20, height_cm: 15 },
    package_count: 1,
    pickup_address: { address_line1: '55 Ayala Ave', city: 'Makati', province: 'Metro Manila', latitude: 14.5547, longitude: 121.0244 },
    delivery_address: { address_line1: '100 C5 Road', city: 'Taguig', province: 'Metro Manila', latitude: 14.5176, longitude: 121.0509 },
    estimated_pickup_at: '2026-02-28T10:00:00.000Z',
    actual_pickup_at: '2026-02-28T10:15:00.000Z',
    estimated_delivery_at: '2026-03-01T18:00:00.000Z',
    actual_delivery_at: null,
    shipping_fee: 150,
    insurance_amount: 0,
    cod_amount: 2000,
    carrier_status: 'returned',
    carrier_response: { reason: 'Wrong address', return_date: '2026-03-02' },
    label_url: 'https://cdn.daltaners.ph/labels/shp-009.pdf',
    label_format: 'pdf',
    notes: 'Returned — customer provided wrong address',
    metadata: {},
    created_at: '2026-02-28T09:30:00.000Z',
    updated_at: '2026-03-02T10:00:00.000Z',
  },
  {
    id: 'shp-010',
    shipment_number: 'SHP-20260303-001',
    order_id: ORDER_IDS[9],
    carrier_id: 'car-004',
    carrier_service_id: 'svc-006',
    store_id: STORE_IDS[0],
    status: 'picked_up',
    tracking_number: 'DLT-2026030300001',
    carrier_reference: null,
    weight_kg: 4.0,
    dimensions: { length_cm: 35, width_cm: 30, height_cm: 20 },
    package_count: 1,
    pickup_address: { address_line1: '123 Rizal Ave', city: 'Manila', province: 'Metro Manila', latitude: 14.5995, longitude: 120.9842 },
    delivery_address: { address_line1: '777 España Blvd', city: 'Manila', province: 'Metro Manila', latitude: 14.6093, longitude: 120.9888 },
    estimated_pickup_at: '2026-03-03T08:00:00.000Z',
    actual_pickup_at: '2026-03-03T08:10:00.000Z',
    estimated_delivery_at: '2026-03-03T11:00:00.000Z',
    actual_delivery_at: null,
    shipping_fee: 99,
    insurance_amount: 0,
    cod_amount: 0,
    carrier_status: 'picked_up',
    carrier_response: null,
    label_url: 'https://cdn.daltaners.ph/labels/shp-010.pdf',
    label_format: 'pdf',
    notes: null,
    metadata: {},
    created_at: '2026-03-03T07:30:00.000Z',
    updated_at: '2026-03-03T08:10:00.000Z',
  },
];

// ── Stats Helper ──────────────────────────────────────

export function computeShipmentStats(list: MockShipment[]): MockShipmentStats {
  const delivered = list.filter((s) => s.status === 'delivered');
  const deliveryDays = delivered
    .filter((s) => s.actual_delivery_at && s.created_at)
    .map((s) => {
      const diff = new Date(s.actual_delivery_at!).getTime() - new Date(s.created_at).getTime();
      return diff / (1000 * 60 * 60 * 24);
    });

  return {
    total: list.length,
    pending: list.filter((s) => s.status === 'pending').length,
    booked: list.filter((s) => s.status === 'booked').length,
    in_transit: list.filter((s) => ['in_transit', 'out_for_delivery', 'picked_up'].includes(s.status)).length,
    delivered: delivered.length,
    failed: list.filter((s) => ['failed', 'returned_to_sender'].includes(s.status)).length,
    cancelled: list.filter((s) => s.status === 'cancelled').length,
    total_shipping_fees: list.reduce((sum, s) => sum + s.shipping_fee, 0),
    avg_delivery_days: deliveryDays.length > 0
      ? Number((deliveryDays.reduce((a, b) => a + b, 0) / deliveryDays.length).toFixed(1))
      : 0,
  };
}
