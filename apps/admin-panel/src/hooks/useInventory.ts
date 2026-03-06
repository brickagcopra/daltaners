import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface StockEntry {
  id: string;
  product_id: string;
  variant_id: string | null;
  store_location_id: string;
  quantity: number;
  reserved_quantity: number;
  reorder_point: number;
  reorder_quantity: number;
  batch_number: string | null;
  expiry_date: string | null;
  last_restocked_at: string | null;
  updated_at: string;
  available_quantity: number;
  product_name: string | null;
  product_sku: string | null;
  product_price: number | null;
  location_name: string | null;
  location_city: string | null;
  store_name: string | null;
}

export interface InventoryStats {
  total_entries: number;
  total_quantity: number;
  total_reserved: number;
  low_stock_count: number;
  out_of_stock_count: number;
}

export interface StockMovement {
  id: string;
  stock_id: string;
  movement_type: 'in' | 'out' | 'adjustment' | 'reservation' | 'release' | 'return';
  quantity: number;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  performed_by: string | null;
  created_at: string;
  product_name: string | null;
  location_name: string | null;
}

interface StockFilters {
  page?: number;
  limit?: number;
  search?: string;
  store_location_id?: string;
  status?: string;
}

interface MovementsFilters {
  page?: number;
  limit?: number;
  stock_id?: string;
  movement_type?: string;
}

interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface StatsResponse {
  success: boolean;
  data: InventoryStats;
}

export function useInventoryStock(filters: StockFilters = {}) {
  const { page = 1, limit = 20, search, store_location_id, status } = filters;

  return useQuery({
    queryKey: ['admin', 'inventory', 'stock', { page, limit, search, store_location_id, status }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (search) params.set('search', search);
      if (store_location_id) params.set('store_location_id', store_location_id);
      if (status) params.set('status', status);

      const response = await api.get<PaginatedResponse<StockEntry>>(
        `/inventory/admin/stock?${params.toString()}`,
      );
      return response.data;
    },
  });
}

export function useInventoryStats() {
  return useQuery({
    queryKey: ['admin', 'inventory', 'stats'],
    queryFn: async () => {
      const response = await api.get<StatsResponse>('/inventory/admin/stats');
      return response.data;
    },
    staleTime: 60 * 1000,
  });
}

export function useInventoryMovements(filters: MovementsFilters = {}) {
  const { page = 1, limit = 20, stock_id, movement_type } = filters;

  return useQuery({
    queryKey: ['admin', 'inventory', 'movements', { page, limit, stock_id, movement_type }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (stock_id) params.set('stock_id', stock_id);
      if (movement_type) params.set('movement_type', movement_type);

      const response = await api.get<PaginatedResponse<StockMovement>>(
        `/inventory/admin/movements?${params.toString()}`,
      );
      return response.data;
    },
  });
}

export function useAdjustStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      product_id: string;
      store_location_id: string;
      quantity: number;
      notes?: string;
      variant_id?: string;
    }) => {
      const response = await api.post('/inventory/admin/adjust', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'inventory'] });
    },
  });
}
