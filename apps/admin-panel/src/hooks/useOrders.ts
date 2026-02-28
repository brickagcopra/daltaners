import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  storeName: string;
  storeId: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'delivering' | 'delivered' | 'cancelled';
  paymentMethod: 'cod' | 'gcash' | 'maya' | 'card' | 'wallet';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  total: number;
  itemCount: number;
  deliveryAddress: string;
  riderName: string | null;
  createdAt: string;
  completedAt: string | null;
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
  topStores: { storeId: string; storeName: string; orderCount: number; revenue: number }[];
}

interface OrdersFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  paymentMethod?: string;
  dateFrom?: string;
  dateTo?: string;
  storeId?: string;
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
  const { page = 1, limit = 20, search, status, paymentMethod, dateFrom, dateTo, storeId } = filters;

  return useQuery({
    queryKey: ['admin', 'orders', { page, limit, search, status, paymentMethod, dateFrom, dateTo, storeId }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      if (paymentMethod) params.set('paymentMethod', paymentMethod);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      if (storeId) params.set('storeId', storeId);

      const response = await api.get<OrdersResponse>(`/admin/orders?${params.toString()}`);
      return response.data;
    },
  });
}

export function useOrderStats() {
  return useQuery({
    queryKey: ['admin', 'orders', 'stats'],
    queryFn: async () => {
      const response = await api.get<OrderStatsResponse>('/admin/orders/stats');
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
  });
}
