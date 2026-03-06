import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  store_id: string;
  status: string;
  order_type: string;
  service_type: string;
  delivery_type: string;
  subtotal: number;
  delivery_fee: number;
  service_fee: number;
  tax_amount: number;
  discount_amount: number;
  tip_amount: number;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  delivery_address: Record<string, unknown> | null;
  cancellation_reason: string | null;
  scheduled_at: string | null;
  estimated_delivery_at: string | null;
  actual_delivery_at: string | null;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
}

export interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  total_price: number;
  status: string;
}

export interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  todayOrders: number;
  todayRevenue: number;
  pendingOrders: number;
  cancelledOrders: number;
  averageOrderValue: number;
  ordersByDay: { date: string; count: number; revenue: number }[];
  ordersByStatus: { status: string; count: number }[];
  topStores: { store_id: string; store_name: string; order_count: number; revenue: number }[];
}

interface OrdersFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  payment_method?: string;
  payment_status?: string;
  order_type?: string;
  store_id?: string;
  date_from?: string;
  date_to?: string;
}

interface OrdersResponse {
  success: boolean;
  data: Order[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface OrderStatsResponse {
  success: boolean;
  data: OrderStats;
}

export function useAllOrders(filters: OrdersFilters = {}) {
  const { page = 1, limit = 20, search, status, payment_method, payment_status, order_type, store_id, date_from, date_to } = filters;

  return useQuery({
    queryKey: ['admin', 'orders', { page, limit, search, status, payment_method, payment_status, order_type, store_id, date_from, date_to }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      if (payment_method) params.set('payment_method', payment_method);
      if (payment_status) params.set('payment_status', payment_status);
      if (order_type) params.set('order_type', order_type);
      if (store_id) params.set('store_id', store_id);
      if (date_from) params.set('date_from', date_from);
      if (date_to) params.set('date_to', date_to);

      const response = await api.get<OrdersResponse>(`/orders/admin/orders?${params.toString()}`);
      return response.data;
    },
  });
}

const defaultStats: OrderStats = {
  totalOrders: 0,
  totalRevenue: 0,
  todayOrders: 0,
  todayRevenue: 0,
  pendingOrders: 0,
  cancelledOrders: 0,
  averageOrderValue: 0,
  ordersByDay: [],
  ordersByStatus: [],
  topStores: [],
};

export function useOrderStats() {
  return useQuery({
    queryKey: ['admin', 'orders', 'stats'],
    queryFn: async () => {
      const response = await api.get<OrderStatsResponse>('/orders/admin/stats');
      const raw = response.data;
      const stats = raw?.data && typeof raw.data === 'object' && 'totalOrders' in raw.data
        ? raw.data
        : defaultStats;
      return { success: true, data: stats } as OrderStatsResponse;
    },
    staleTime: 2 * 60 * 1000,
  });
}
