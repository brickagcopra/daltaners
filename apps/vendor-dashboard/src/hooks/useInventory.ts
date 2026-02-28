import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiResponse } from '@/lib/api';

export interface StockItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string | null;
  sku: string;
  variantName: string | null;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  lowStockThreshold: number;
  isLowStock: boolean;
  lastRestocked: string | null;
  updatedAt: string;
}

export interface StockAdjustment {
  productId: string;
  variantId?: string;
  adjustment: number;
  reason: string;
  notes?: string;
}

interface StockFilters {
  page?: number;
  limit?: number;
  search?: string;
  lowStockOnly?: boolean;
}

export function useStockLevels(storeId: string | null, filters: StockFilters = {}) {
  return useQuery({
    queryKey: ['stock-levels', storeId, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));
      if (filters.search) params.set('search', filters.search);
      if (filters.lowStockOnly) params.set('lowStockOnly', 'true');

      const { data } = await api.get<ApiResponse<StockItem[]>>(
        `/stores/${storeId}/inventory?${params.toString()}`,
      );
      return data;
    },
    enabled: !!storeId,
  });
}

export function useAdjustStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      storeId,
      adjustment,
    }: {
      storeId: string;
      adjustment: StockAdjustment;
    }) => {
      const { data } = await api.post<ApiResponse<StockItem>>(
        `/stores/${storeId}/inventory/adjust`,
        adjustment,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-levels'] });
      queryClient.invalidateQueries({ queryKey: ['store-products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}
