import { http, HttpResponse, delay } from 'msw';
import {
  shippingCarriers,
  carrierServices,
  shipments,
  computeShipmentStats,
  MockShipment,
  MockShippingCarrier,
  MockCarrierService,
} from '../data/shipping';
import { wrap, paginatedWrap, errorResponse, getSearchParams } from '../helpers';

const BASE = '/api/v1';
let localCarriers = [...shippingCarriers];
let localServices = [...carrierServices];
let localShipments = [...shipments];
let nextCarrierId = localCarriers.length + 1;
let nextServiceId = localServices.length + 1;
let nextShipmentId = localShipments.length + 1;

// ────────────────────────────────────────────────────
// Vendor / Shared endpoints: /api/v1/shipping/*
// ────────────────────────────────────────────────────

async function handleListCarriers() {
  await delay(150);
  const active = localCarriers.filter((c) => c.is_active);
  return wrap(active);
}

async function handleGetCarrier(id: string) {
  await delay(100);
  const carrier = localCarriers.find((c) => c.id === id);
  if (!carrier) return errorResponse(404, 'CARRIER_NOT_FOUND', 'Carrier not found');
  return wrap(carrier);
}

async function handleGetCarrierServices(carrierId: string) {
  await delay(100);
  const services = localServices.filter((s) => s.carrier_id === carrierId && s.is_active);
  return wrap(services);
}

async function handleGetRates(request: Request) {
  await delay(250);
  const body = (await request.json()) as Record<string, unknown>;
  const weightKg = (body.weight_kg as number) || 1;

  const rates = localCarriers
    .filter((c) => c.is_active)
    .flatMap((carrier) => {
      const services = localServices.filter((s) => s.carrier_id === carrier.id && s.is_active);
      return services.map((svc) => ({
        carrier_id: carrier.id,
        carrier_name: carrier.name,
        carrier_code: carrier.code,
        carrier_logo_url: carrier.logo_url,
        service_id: svc.id,
        service_name: svc.name,
        service_code: svc.code,
        estimated_days_min: svc.estimated_days_min,
        estimated_days_max: svc.estimated_days_max,
        total_fee: svc.base_price + svc.per_kg_price * Math.max(weightKg, 1),
        base_price: svc.base_price,
        per_kg_price: svc.per_kg_price,
        is_cod_supported: svc.is_cod_supported,
        is_insurance_available: svc.is_insurance_available,
      }));
    })
    .sort((a, b) => a.total_fee - b.total_fee);

  return wrap(rates);
}

async function handleCreateShipment(request: Request) {
  await delay(300);
  const body = (await request.json()) as Record<string, unknown>;

  const orderId = body.order_id as string;
  const carrierId = body.carrier_id as string;
  if (!orderId || !carrierId) {
    return errorResponse(400, 'VALIDATION_ERROR', 'order_id and carrier_id are required');
  }

  const now = new Date().toISOString();
  const num = String(nextShipmentId).padStart(3, '0');
  const dateStr = now.slice(0, 10).replace(/-/g, '');

  const newShipment: MockShipment = {
    id: `shp-new-${nextShipmentId}`,
    shipment_number: `SHP-${dateStr}-${num}`,
    order_id: orderId,
    carrier_id: carrierId,
    carrier_service_id: (body.carrier_service_id as string) || null,
    store_id: (body.store_id as string) || 'store-001-uuid',
    status: 'pending',
    tracking_number: null,
    carrier_reference: null,
    weight_kg: (body.weight_kg as number) || null,
    dimensions: (body.dimensions as Record<string, number>) || null,
    package_count: (body.package_count as number) || 1,
    pickup_address: (body.pickup_address as Record<string, unknown>) || {},
    delivery_address: (body.delivery_address as Record<string, unknown>) || {},
    estimated_pickup_at: null,
    actual_pickup_at: null,
    estimated_delivery_at: null,
    actual_delivery_at: null,
    shipping_fee: (body.shipping_fee as number) || 0,
    insurance_amount: (body.insurance_amount as number) || 0,
    cod_amount: (body.cod_amount as number) || 0,
    carrier_status: null,
    carrier_response: null,
    label_url: null,
    label_format: null,
    notes: (body.notes as string) || null,
    metadata: (body.metadata as Record<string, unknown>) || {},
    created_at: now,
    updated_at: now,
  };

  localShipments.unshift(newShipment);
  nextShipmentId++;
  return HttpResponse.json({ success: true, data: newShipment, timestamp: now }, { status: 201 });
}

async function handleListShipments(request: Request) {
  await delay(200);
  const sp = getSearchParams(request);
  const page = parseInt(sp.get('page') || '1', 10);
  const limit = parseInt(sp.get('limit') || '20', 10);
  const storeId = sp.get('store_id');
  const status = sp.get('status');
  const carrierId = sp.get('carrier_id');

  let filtered = [...localShipments];
  if (storeId) filtered = filtered.filter((s) => s.store_id === storeId);
  if (status) filtered = filtered.filter((s) => s.status === status);
  if (carrierId) filtered = filtered.filter((s) => s.carrier_id === carrierId);

  filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return paginatedWrap(filtered, page, limit);
}

async function handleGetShipment(id: string) {
  await delay(100);
  const shipment = localShipments.find((s) => s.id === id);
  if (!shipment) return errorResponse(404, 'SHIPMENT_NOT_FOUND', 'Shipment not found');

  const carrier = localCarriers.find((c) => c.id === shipment.carrier_id);
  const service = shipment.carrier_service_id
    ? localServices.find((s) => s.id === shipment.carrier_service_id)
    : undefined;

  return wrap({ ...shipment, carrier, carrier_service: service });
}

async function handleGetShipmentByOrder(orderId: string) {
  await delay(100);
  const shipment = localShipments.find((s) => s.order_id === orderId);
  if (!shipment) return errorResponse(404, 'SHIPMENT_NOT_FOUND', 'No shipment found for this order');
  return wrap(shipment);
}

async function handleBookShipment(id: string) {
  await delay(300);
  const shipment = localShipments.find((s) => s.id === id);
  if (!shipment) return errorResponse(404, 'SHIPMENT_NOT_FOUND', 'Shipment not found');
  if (shipment.status !== 'pending') {
    return errorResponse(400, 'INVALID_STATUS', 'Only pending shipments can be booked');
  }

  const carrier = localCarriers.find((c) => c.id === shipment.carrier_id);
  const prefix = carrier?.code?.toUpperCase().slice(0, 3) || 'SHP';
  shipment.status = 'booked';
  shipment.tracking_number = `${prefix}${Date.now().toString().slice(-10)}`;
  shipment.carrier_reference = `REF-${shipment.tracking_number}`;
  shipment.carrier_status = 'booked';
  shipment.estimated_pickup_at = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  shipment.updated_at = new Date().toISOString();

  return wrap(shipment);
}

async function handleGenerateLabel(id: string) {
  await delay(300);
  const shipment = localShipments.find((s) => s.id === id);
  if (!shipment) return errorResponse(404, 'SHIPMENT_NOT_FOUND', 'Shipment not found');
  if (!['booked', 'label_generated'].includes(shipment.status)) {
    return errorResponse(400, 'INVALID_STATUS', 'Shipment must be booked before generating label');
  }

  shipment.status = 'label_generated';
  shipment.label_url = `https://cdn.daltaners.ph/labels/${id}.pdf`;
  shipment.label_format = 'pdf';
  shipment.updated_at = new Date().toISOString();

  return wrap(shipment);
}

async function handleUpdateStatus(id: string, request: Request) {
  await delay(200);
  const shipment = localShipments.find((s) => s.id === id);
  if (!shipment) return errorResponse(404, 'SHIPMENT_NOT_FOUND', 'Shipment not found');

  const body = (await request.json()) as Record<string, unknown>;
  const newStatus = body.status as string;
  if (!newStatus) return errorResponse(400, 'VALIDATION_ERROR', 'status is required');

  shipment.status = newStatus as MockShipment['status'];
  if (body.tracking_number) shipment.tracking_number = body.tracking_number as string;
  if (body.carrier_reference) shipment.carrier_reference = body.carrier_reference as string;
  if (body.carrier_status) shipment.carrier_status = body.carrier_status as string;
  if (body.label_url) shipment.label_url = body.label_url as string;
  if (body.label_format) shipment.label_format = body.label_format as string;
  if (body.notes) shipment.notes = body.notes as string;

  if (newStatus === 'picked_up') {
    shipment.actual_pickup_at = new Date().toISOString();
  } else if (newStatus === 'delivered') {
    shipment.actual_delivery_at = new Date().toISOString();
  }

  shipment.updated_at = new Date().toISOString();
  return wrap(shipment);
}

async function handleCancelShipment(id: string, request: Request) {
  await delay(200);
  const shipment = localShipments.find((s) => s.id === id);
  if (!shipment) return errorResponse(404, 'SHIPMENT_NOT_FOUND', 'Shipment not found');

  if (['delivered', 'cancelled'].includes(shipment.status)) {
    return errorResponse(400, 'INVALID_STATUS', 'Cannot cancel a delivered or already cancelled shipment');
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  shipment.status = 'cancelled';
  shipment.notes = (body.reason as string) || shipment.notes || 'Cancelled';
  shipment.updated_at = new Date().toISOString();

  return wrap(shipment);
}

async function handleTrackShipment(id: string) {
  await delay(200);
  const shipment = localShipments.find((s) => s.id === id);
  if (!shipment) return errorResponse(404, 'SHIPMENT_NOT_FOUND', 'Shipment not found');

  const events = [];
  events.push({ status: 'pending', timestamp: shipment.created_at, location: 'System', description: 'Shipment created' });
  if (['booked', 'label_generated', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'returned_to_sender'].includes(shipment.status)) {
    events.push({ status: 'booked', timestamp: shipment.updated_at, location: 'System', description: 'Booked with carrier' });
  }
  if (['picked_up', 'in_transit', 'out_for_delivery', 'delivered'].includes(shipment.status) && shipment.actual_pickup_at) {
    events.push({ status: 'picked_up', timestamp: shipment.actual_pickup_at, location: (shipment.pickup_address as Record<string, unknown>).city as string, description: 'Picked up from store' });
  }
  if (['in_transit', 'out_for_delivery', 'delivered'].includes(shipment.status)) {
    events.push({ status: 'in_transit', timestamp: shipment.updated_at, location: 'Sorting Hub', description: 'In transit to destination' });
  }
  if (['out_for_delivery', 'delivered'].includes(shipment.status)) {
    events.push({ status: 'out_for_delivery', timestamp: shipment.updated_at, location: (shipment.delivery_address as Record<string, unknown>).city as string, description: 'Out for delivery' });
  }
  if (shipment.status === 'delivered' && shipment.actual_delivery_at) {
    events.push({ status: 'delivered', timestamp: shipment.actual_delivery_at, location: (shipment.delivery_address as Record<string, unknown>).city as string, description: 'Delivered successfully' });
  }
  if (shipment.status === 'failed') {
    events.push({ status: 'failed', timestamp: shipment.updated_at, location: 'Unknown', description: shipment.notes || 'Delivery failed' });
  }
  if (shipment.status === 'returned_to_sender') {
    events.push({ status: 'returned_to_sender', timestamp: shipment.updated_at, location: (shipment.pickup_address as Record<string, unknown>).city as string, description: 'Returned to sender' });
  }

  return wrap({
    shipment_id: shipment.id,
    tracking_number: shipment.tracking_number,
    carrier_status: shipment.carrier_status,
    events: events.reverse(),
  });
}

async function handleShipmentStats(request: Request) {
  await delay(150);
  const sp = getSearchParams(request);
  const storeId = sp.get('store_id');
  let filtered = [...localShipments];
  if (storeId) filtered = filtered.filter((s) => s.store_id === storeId);
  return wrap(computeShipmentStats(filtered));
}

// ────────────────────────────────────────────────────
// Admin endpoints: /api/v1/admin/shipping/*
// ────────────────────────────────────────────────────

async function handleAdminCreateCarrier(request: Request) {
  await delay(200);
  const body = (await request.json()) as Record<string, unknown>;
  const now = new Date().toISOString();

  const existing = localCarriers.find((c) => c.code === body.code);
  if (existing) return errorResponse(409, 'CARRIER_EXISTS', 'A carrier with this code already exists');

  const newCarrier: MockShippingCarrier = {
    id: `car-new-${nextCarrierId}`,
    name: (body.name as string) || 'New Carrier',
    code: (body.code as string) || `carrier-${nextCarrierId}`,
    logo_url: (body.logo_url as string) || null,
    type: (body.type as MockShippingCarrier['type']) || 'third_party',
    api_base_url: (body.api_base_url as string) || null,
    api_credentials: (body.api_credentials as Record<string, unknown>) || {},
    supported_service_types: (body.supported_service_types as string[]) || ['grocery', 'food', 'pharmacy', 'parcel'],
    is_active: body.is_active !== false,
    priority: (body.priority as number) || 0,
    contact_phone: (body.contact_phone as string) || null,
    contact_email: (body.contact_email as string) || null,
    webhook_secret: (body.webhook_secret as string) || null,
    tracking_url_template: (body.tracking_url_template as string) || null,
    settings: (body.settings as Record<string, unknown>) || {},
    created_at: now,
    updated_at: now,
  };

  localCarriers.push(newCarrier);
  nextCarrierId++;
  return HttpResponse.json({ success: true, data: newCarrier, timestamp: now }, { status: 201 });
}

async function handleAdminListCarriers(request: Request) {
  await delay(150);
  const sp = getSearchParams(request);
  const page = parseInt(sp.get('page') || '1', 10);
  const limit = parseInt(sp.get('limit') || '20', 10);
  const search = sp.get('search')?.toLowerCase();
  const type = sp.get('type');
  const isActive = sp.get('is_active');

  let filtered = [...localCarriers];
  if (search) filtered = filtered.filter((c) => c.name.toLowerCase().includes(search) || c.code.toLowerCase().includes(search));
  if (type) filtered = filtered.filter((c) => c.type === type);
  if (isActive !== null && isActive !== undefined && isActive !== '') {
    filtered = filtered.filter((c) => c.is_active === (isActive === 'true'));
  }

  return paginatedWrap(filtered, page, limit);
}

async function handleAdminUpdateCarrier(id: string, request: Request) {
  await delay(200);
  const carrier = localCarriers.find((c) => c.id === id);
  if (!carrier) return errorResponse(404, 'CARRIER_NOT_FOUND', 'Carrier not found');

  const body = (await request.json()) as Record<string, unknown>;
  if (body.name !== undefined) carrier.name = body.name as string;
  if (body.logo_url !== undefined) carrier.logo_url = body.logo_url as string;
  if (body.type !== undefined) carrier.type = body.type as MockShippingCarrier['type'];
  if (body.api_base_url !== undefined) carrier.api_base_url = body.api_base_url as string;
  if (body.api_credentials !== undefined) carrier.api_credentials = body.api_credentials as Record<string, unknown>;
  if (body.supported_service_types !== undefined) carrier.supported_service_types = body.supported_service_types as string[];
  if (body.is_active !== undefined) carrier.is_active = body.is_active as boolean;
  if (body.priority !== undefined) carrier.priority = body.priority as number;
  if (body.contact_phone !== undefined) carrier.contact_phone = body.contact_phone as string;
  if (body.contact_email !== undefined) carrier.contact_email = body.contact_email as string;
  if (body.tracking_url_template !== undefined) carrier.tracking_url_template = body.tracking_url_template as string;
  if (body.settings !== undefined) carrier.settings = body.settings as Record<string, unknown>;
  carrier.updated_at = new Date().toISOString();

  return wrap(carrier);
}

async function handleAdminDeleteCarrier(id: string) {
  await delay(200);
  const idx = localCarriers.findIndex((c) => c.id === id);
  if (idx === -1) return errorResponse(404, 'CARRIER_NOT_FOUND', 'Carrier not found');
  localCarriers.splice(idx, 1);
  localServices = localServices.filter((s) => s.carrier_id !== id);
  return new HttpResponse(null, { status: 204 });
}

async function handleAdminCreateService(request: Request) {
  await delay(200);
  const body = (await request.json()) as Record<string, unknown>;
  const carrierId = body.carrier_id as string;
  if (!carrierId) return errorResponse(400, 'VALIDATION_ERROR', 'carrier_id is required');

  const carrier = localCarriers.find((c) => c.id === carrierId);
  if (!carrier) return errorResponse(404, 'CARRIER_NOT_FOUND', 'Carrier not found');

  const now = new Date().toISOString();
  const newService: MockCarrierService = {
    id: `svc-new-${nextServiceId}`,
    carrier_id: carrierId,
    name: (body.name as string) || 'New Service',
    code: (body.code as string) || `service-${nextServiceId}`,
    description: (body.description as string) || null,
    estimated_days_min: (body.estimated_days_min as number) || 1,
    estimated_days_max: (body.estimated_days_max as number) || 3,
    base_price: (body.base_price as number) || 0,
    per_kg_price: (body.per_kg_price as number) || 0,
    max_weight_kg: (body.max_weight_kg as number) || 50,
    max_dimensions: (body.max_dimensions as Record<string, number>) || null,
    is_cod_supported: (body.is_cod_supported as boolean) || false,
    is_insurance_available: (body.is_insurance_available as boolean) || false,
    coverage_areas: (body.coverage_areas as string[]) || null,
    is_active: body.is_active !== false,
    created_at: now,
  };

  localServices.push(newService);
  nextServiceId++;
  return HttpResponse.json({ success: true, data: newService, timestamp: now }, { status: 201 });
}

async function handleAdminUpdateService(id: string, request: Request) {
  await delay(200);
  const service = localServices.find((s) => s.id === id);
  if (!service) return errorResponse(404, 'SERVICE_NOT_FOUND', 'Carrier service not found');

  const body = (await request.json()) as Record<string, unknown>;
  if (body.name !== undefined) service.name = body.name as string;
  if (body.code !== undefined) service.code = body.code as string;
  if (body.description !== undefined) service.description = body.description as string;
  if (body.estimated_days_min !== undefined) service.estimated_days_min = body.estimated_days_min as number;
  if (body.estimated_days_max !== undefined) service.estimated_days_max = body.estimated_days_max as number;
  if (body.base_price !== undefined) service.base_price = body.base_price as number;
  if (body.per_kg_price !== undefined) service.per_kg_price = body.per_kg_price as number;
  if (body.max_weight_kg !== undefined) service.max_weight_kg = body.max_weight_kg as number;
  if (body.max_dimensions !== undefined) service.max_dimensions = body.max_dimensions as Record<string, number>;
  if (body.is_cod_supported !== undefined) service.is_cod_supported = body.is_cod_supported as boolean;
  if (body.is_insurance_available !== undefined) service.is_insurance_available = body.is_insurance_available as boolean;
  if (body.coverage_areas !== undefined) service.coverage_areas = body.coverage_areas as string[];
  if (body.is_active !== undefined) service.is_active = body.is_active as boolean;

  return wrap(service);
}

async function handleAdminDeleteService(id: string) {
  await delay(200);
  const idx = localServices.findIndex((s) => s.id === id);
  if (idx === -1) return errorResponse(404, 'SERVICE_NOT_FOUND', 'Carrier service not found');
  localServices.splice(idx, 1);
  return new HttpResponse(null, { status: 204 });
}

async function handleAdminListShipments(request: Request) {
  await delay(200);
  const sp = getSearchParams(request);
  const page = parseInt(sp.get('page') || '1', 10);
  const limit = parseInt(sp.get('limit') || '20', 10);
  const search = sp.get('search')?.toLowerCase();
  const storeId = sp.get('store_id');
  const status = sp.get('status');
  const carrierId = sp.get('carrier_id');
  const orderId = sp.get('order_id');
  const dateFrom = sp.get('date_from');
  const dateTo = sp.get('date_to');
  const sortBy = sp.get('sort_by') || 'created_at';
  const sortOrder = sp.get('sort_order') || 'DESC';

  let filtered = [...localShipments];
  if (search) {
    filtered = filtered.filter(
      (s) =>
        s.shipment_number.toLowerCase().includes(search) ||
        (s.tracking_number && s.tracking_number.toLowerCase().includes(search)),
    );
  }
  if (storeId) filtered = filtered.filter((s) => s.store_id === storeId);
  if (status) filtered = filtered.filter((s) => s.status === status);
  if (carrierId) filtered = filtered.filter((s) => s.carrier_id === carrierId);
  if (orderId) filtered = filtered.filter((s) => s.order_id === orderId);
  if (dateFrom) filtered = filtered.filter((s) => s.created_at >= dateFrom);
  if (dateTo) filtered = filtered.filter((s) => s.created_at <= dateTo);

  filtered.sort((a, b) => {
    const aVal = (a as unknown as Record<string, unknown>)[sortBy] as string;
    const bVal = (b as unknown as Record<string, unknown>)[sortBy] as string;
    const cmp = String(aVal).localeCompare(String(bVal));
    return sortOrder === 'DESC' ? -cmp : cmp;
  });

  return paginatedWrap(filtered, page, limit);
}

async function handleAdminShipmentStats() {
  await delay(150);
  return wrap(computeShipmentStats(localShipments));
}

async function handleAdminWebhook(carrierCode: string, request: Request) {
  await delay(100);
  const body = (await request.json()) as Record<string, unknown>;
  // In real implementation, this would verify webhook signature and update shipment
  return wrap({ message: `Webhook received for carrier: ${carrierCode}`, payload: body });
}

// ────────────────────────────────────────────────────
// Handler Registration
// ────────────────────────────────────────────────────

export const shippingHandlers = [
  // ── Vendor / Shared shipping endpoints ──
  http.get(`${BASE}/shipping/carriers`, () => handleListCarriers()),
  http.get(`${BASE}/shipping/carriers/:id/services`, ({ params }) => handleGetCarrierServices(params.id as string)),
  http.get(`${BASE}/shipping/carriers/:id`, ({ params }) => handleGetCarrier(params.id as string)),
  http.post(`${BASE}/shipping/rates`, ({ request }) => handleGetRates(request)),
  http.post(`${BASE}/shipping/shipments`, ({ request }) => handleCreateShipment(request)),
  http.get(`${BASE}/shipping/shipments/stats/summary`, ({ request }) => handleShipmentStats(request)),
  http.get(`${BASE}/shipping/shipments/order/:orderId`, ({ params }) => handleGetShipmentByOrder(params.orderId as string)),
  http.get(`${BASE}/shipping/shipments/:id/track`, ({ params }) => handleTrackShipment(params.id as string)),
  http.get(`${BASE}/shipping/shipments/:id`, ({ params }) => handleGetShipment(params.id as string)),
  http.post(`${BASE}/shipping/shipments/:id/book`, ({ params }) => handleBookShipment(params.id as string)),
  http.post(`${BASE}/shipping/shipments/:id/label`, ({ params }) => handleGenerateLabel(params.id as string)),
  http.patch(`${BASE}/shipping/shipments/:id/status`, ({ params, request }) => handleUpdateStatus(params.id as string, request)),
  http.post(`${BASE}/shipping/shipments/:id/cancel`, ({ params, request }) => handleCancelShipment(params.id as string, request)),
  http.get(`${BASE}/shipping/shipments`, ({ request }) => handleListShipments(request)),

  // ── Admin shipping endpoints ──
  http.post(`${BASE}/admin/shipping/carriers`, ({ request }) => handleAdminCreateCarrier(request)),
  http.get(`${BASE}/admin/shipping/carriers`, ({ request }) => handleAdminListCarriers(request)),
  http.get(`${BASE}/admin/shipping/carriers/:id/services`, ({ params }) => handleGetCarrierServices(params.id as string)),
  http.get(`${BASE}/admin/shipping/carriers/:id`, ({ params }) => handleGetCarrier(params.id as string)),
  http.patch(`${BASE}/admin/shipping/carriers/:id`, ({ params, request }) => handleAdminUpdateCarrier(params.id as string, request)),
  http.delete(`${BASE}/admin/shipping/carriers/:id`, ({ params }) => handleAdminDeleteCarrier(params.id as string)),
  http.post(`${BASE}/admin/shipping/services`, ({ request }) => handleAdminCreateService(request)),
  http.get(`${BASE}/admin/shipping/services/:id`, ({ params }) => handleGetCarrier(params.id as string)),
  http.patch(`${BASE}/admin/shipping/services/:id`, ({ params, request }) => handleAdminUpdateService(params.id as string, request)),
  http.delete(`${BASE}/admin/shipping/services/:id`, ({ params }) => handleAdminDeleteService(params.id as string)),
  http.get(`${BASE}/admin/shipping/shipments/stats`, () => handleAdminShipmentStats()),
  http.get(`${BASE}/admin/shipping/shipments/:id`, ({ params }) => handleGetShipment(params.id as string)),
  http.get(`${BASE}/admin/shipping/shipments`, ({ request }) => handleAdminListShipments(request)),
  http.patch(`${BASE}/admin/shipping/shipments/:id/status`, ({ params, request }) => handleUpdateStatus(params.id as string, request)),
  http.post(`${BASE}/admin/shipping/webhook/:carrierCode`, ({ params, request }) => handleAdminWebhook(params.carrierCode as string, request)),

  // ── Dual-path registration (backend convention: /delivery/shipping/*) ──
  http.get(`${BASE}/delivery/shipping/carriers`, () => handleListCarriers()),
  http.get(`${BASE}/delivery/shipping/carriers/:id/services`, ({ params }) => handleGetCarrierServices(params.id as string)),
  http.get(`${BASE}/delivery/shipping/carriers/:id`, ({ params }) => handleGetCarrier(params.id as string)),
  http.post(`${BASE}/delivery/shipping/rates`, ({ request }) => handleGetRates(request)),
  http.post(`${BASE}/delivery/shipping/shipments`, ({ request }) => handleCreateShipment(request)),
  http.get(`${BASE}/delivery/shipping/shipments/stats/summary`, ({ request }) => handleShipmentStats(request)),
  http.get(`${BASE}/delivery/shipping/shipments/order/:orderId`, ({ params }) => handleGetShipmentByOrder(params.orderId as string)),
  http.get(`${BASE}/delivery/shipping/shipments/:id/track`, ({ params }) => handleTrackShipment(params.id as string)),
  http.get(`${BASE}/delivery/shipping/shipments/:id`, ({ params }) => handleGetShipment(params.id as string)),
  http.post(`${BASE}/delivery/shipping/shipments/:id/book`, ({ params }) => handleBookShipment(params.id as string)),
  http.post(`${BASE}/delivery/shipping/shipments/:id/label`, ({ params }) => handleGenerateLabel(params.id as string)),
  http.patch(`${BASE}/delivery/shipping/shipments/:id/status`, ({ params, request }) => handleUpdateStatus(params.id as string, request)),
  http.post(`${BASE}/delivery/shipping/shipments/:id/cancel`, ({ params, request }) => handleCancelShipment(params.id as string, request)),
];
