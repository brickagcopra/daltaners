import { useQuery } from '@tanstack/react-query';
import { api, ApiResponse } from '@/lib/api';

export interface VendorAnalytics {
  revenue: {
    today: number;
    week: number;
    month: number;
    all_time: number;
  };
  orders: {
    today: number;
    week: number;
    month: number;
    all_time: number;
  };
  average_order_value: number;
  orders_by_status: { status: string; count: number }[];
  revenue_by_day: { date: string; revenue: number }[];
  orders_by_day: { date: string; count: number }[];
  top_products: { product_id: string; product_name: string; quantity: number; revenue: number }[];
  fulfillment_rate: number;
  avg_preparation_time_minutes: number;
  peak_hours: { hour: number; count: number }[];
}

export function useVendorAnalytics(storeId: string | null, dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ['vendor-analytics', storeId, dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);

      const { data } = await api.get<ApiResponse<VendorAnalytics>>(
        `/orders/vendor/${storeId}/analytics?${params.toString()}`,
      );
      return data.data;
    },
    enabled: !!storeId,
  });
}
