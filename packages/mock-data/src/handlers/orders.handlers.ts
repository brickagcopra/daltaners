import { http, delay, HttpResponse } from 'msw';
import { wrap, paginatedWrap, errorResponse, getSearchParams } from '../helpers';
import { orders, products } from '../data';
import { getCurrentUser } from './auth.handlers';

const BASE = '/api/v1';

export const ordersHandlers = [
  // GET /orders/me — customer's orders
  http.get(`${BASE}/orders/me`, async ({ request }) => {
    await delay(300);
    const user = getCurrentUser();
    if (!user) return errorResponse(401, 'UNAUTHORIZED', 'Not authenticated');

    const params = getSearchParams(request);
    const page = parseInt(params.get('page') ?? '1', 10);
    const limit = parseInt(params.get('limit') ?? '10', 10);

    const myOrders = orders
      .filter((o) => o.customer_id === user.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return paginatedWrap(myOrders, page, limit);
  }),

  // GET /orders/:id
  http.get(`${BASE}/orders/:id`, async ({ params }) => {
    await delay(200);
    const order = orders.find((o) => o.id === params.id);
    if (!order) {
      return errorResponse(404, 'NOT_FOUND', 'Order not found');
    }
    return wrap(order);
  }),

  // POST /orders — create a new order
  http.post(`${BASE}/orders`, async ({ request }) => {
    await delay(500);
    const user = getCurrentUser();
    if (!user) return errorResponse(401, 'UNAUTHORIZED', 'Not authenticated');

    const body = (await request.json()) as Record<string, unknown>;
    const items = (body.items as Array<{ product_id: string; quantity: number }>) ?? [];

    const orderItems = items.map((item) => {
      const product = products.find((p) => p.id === item.product_id);
      const price = product?.sale_price ?? product?.base_price ?? 0;
      return {
        id: `oi-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        order_id: '',
        product_id: item.product_id,
        variant_id: null,
        product_name: product?.name ?? 'Unknown',
        product_image_url: product?.images[0]?.thumbnail_url ?? null,
        unit_price: price,
        quantity: item.quantity,
        total_price: price * item.quantity,
        discount_amount: 0,
        special_instructions: null,
        substitution_product_id: null,
        status: 'pending',
      };
    });

    const subtotal = orderItems.reduce((s, i) => s + i.total_price, 0);
    const orderType = (body.order_type as string) ?? 'delivery';
    const isPickup = orderType === 'pickup';
    const deliveryFee = isPickup ? 0 : ((body.delivery_fee as number) ?? 49);
    const serviceFee = 15;
    const tax = +(subtotal * 0.12).toFixed(2);

    const newOrder = {
      id: `ord-${Date.now()}`,
      order_number: `BRD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 900) + 100}`,
      customer_id: user.id,
      store_id: body.store_id,
      store_location_id: body.store_location_id,
      status: 'pending',
      order_type: orderType,
      service_type: body.service_type ?? 'grocery',
      delivery_type: isPickup ? null : (body.delivery_type ?? 'standard'),
      scheduled_at: (body.scheduled_at as string) ?? null,
      picked_up_at: null,
      subtotal,
      delivery_fee: deliveryFee,
      service_fee: serviceFee,
      tax_amount: tax,
      discount_amount: 0,
      tip_amount: (body.tip_amount as number) ?? 0,
      total_amount: subtotal + deliveryFee + serviceFee + tax,
      payment_method: body.payment_method ?? 'gcash',
      payment_status: 'pending',
      delivery_address: isPickup ? null : (body.delivery_address ?? null),
      delivery_instructions: body.delivery_instructions ?? null,
      substitution_policy: body.substitution_policy ?? 'accept_similar',
      coupon_id: null,
      coupon_code: body.coupon_code ?? null,
      customer_notes: body.customer_notes ?? null,
      cancellation_reason: null,
      estimated_delivery_at: isPickup ? null : new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      actual_delivery_at: null,
      items: orderItems.map((i) => ({ ...i, order_id: `ord-${Date.now()}` })),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return HttpResponse.json(
      { success: true, data: newOrder, timestamp: new Date().toISOString() },
      { status: 201 },
    );
  }),

  // POST /orders/:id/cancel
  http.post(`${BASE}/orders/:id/cancel`, async ({ params }) => {
    await delay(300);
    const order = orders.find((o) => o.id === params.id);
    if (!order) {
      return errorResponse(404, 'NOT_FOUND', 'Order not found');
    }
    if (['delivered', 'cancelled'].includes(order.status)) {
      return errorResponse(400, 'INVALID_STATUS', 'Cannot cancel this order');
    }

    return wrap({
      ...order,
      status: 'cancelled',
      cancellation_reason: 'Cancelled by customer',
      updated_at: new Date().toISOString(),
    });
  }),
];
