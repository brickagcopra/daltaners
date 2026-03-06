import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface OrderItem {
  product_id: string;
  variant_id?: string;
  name: string;
  image_url: string;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  order_number: string;
  status: OrderStatus;
  order_type: 'delivery' | 'pickup';
  store_id: string;
  store_name: string;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  service_fee: number;
  total: number;
  delivery_address: string;
  delivery_type: 'standard' | 'express' | 'scheduled';
  payment_method: string;
  created_at: string;
  estimated_delivery: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  scheduled_at?: string | null;
  picked_up_at?: string | null;
  status_history: OrderStatusEvent[];
  delivery_person?: {
    id: string;
    name: string;
    phone?: string;
    vehicle_type: string;
    photo_url?: string;
  } | null;
  delivery_lat?: number;
  delivery_lng?: number;
  store_lat?: number;
  store_lng?: number;
}

type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready_for_pickup'
  | 'picked_up'
  | 'on_the_way'
  | 'in_transit'
  | 'delivered'
  | 'cancelled';

interface OrderStatusEvent {
  status: OrderStatus;
  timestamp: string;
  note?: string;
}

interface CreateOrderPayload {
  store_id: string;
  items: { product_id: string; variant_id?: string; quantity: number }[];
  delivery_address_id: string | null;
  delivery_type: 'standard' | 'express' | 'scheduled';
  order_type?: 'delivery' | 'pickup';
  payment_method: string;
  notes?: string;
  scheduled_at?: string;
  coupon_code?: string;
  loyalty_points_used?: number;
}

interface ValidateCouponPayload {
  code: string;
  subtotal: number;
  store_id?: string;
  category_ids?: string[];
}

interface CouponValidationResult {
  valid: boolean;
  coupon_code: string;
  discount_type: 'percentage' | 'fixed_amount' | 'free_delivery';
  discount_value: number;
  discount_amount: number;
  message?: string;
}

interface CouponValidationResponse {
  success: boolean;
  data: CouponValidationResult;
}

interface OrdersResponse {
  success: boolean;
  data: Order[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}

interface OrderResponse {
  success: boolean;
  data: Order;
}

export function useMyOrders(page = 1, limit = 10) {
  return useQuery({
    queryKey: ['my-orders', page, limit],
    queryFn: async () => {
      const { data } = await api.get<OrdersResponse>(
        `/orders/me?page=${page}&limit=${limit}`,
      );
      return data;
    },
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const { data } = await api.get<OrderResponse>(`/orders/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateOrderPayload) => {
      const { data } = await api.post<OrderResponse>('/orders', payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data } = await api.post<OrderResponse>(`/orders/${id}/cancel`, { reason });
      return data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['order', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
    },
  });
}

export function useValidateCoupon() {
  return useMutation({
    mutationFn: async (payload: ValidateCouponPayload) => {
      const { data } = await api.post<CouponValidationResponse>(
        '/orders/coupons/validate',
        payload,
      );
      return data.data;
    },
  });
}

export type { Order, OrderItem, OrderStatus, OrderStatusEvent, CreateOrderPayload, CouponValidationResult };
