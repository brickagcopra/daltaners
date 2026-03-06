import { useQuery } from '@tanstack/react-query';
import { api, type ApiResponse } from '@/lib/api';
import type {
  SalesSummary,
  ProductSale,
  HourlySale,
  CashierPerformance,
  PaymentBreakdown,
  ShiftSummary,
} from '@/types/pos';

interface ReportParams {
  start_date?: string;
  end_date?: string;
}

export function useSalesSummary(storeId: string | undefined, params?: ReportParams) {
  return useQuery({
    queryKey: ['pos', 'reports', 'sales-summary', storeId, params],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<SalesSummary>>(
        `/pos/reports/store/${storeId}/sales-summary`,
        { params },
      );
      return data.data;
    },
    enabled: !!storeId,
    staleTime: 60_000,
  });
}

export function useProductSales(storeId: string | undefined, params?: ReportParams & { limit?: number }) {
  return useQuery({
    queryKey: ['pos', 'reports', 'product-sales', storeId, params],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ProductSale[]>>(
        `/pos/reports/store/${storeId}/product-sales`,
        { params },
      );
      return data.data;
    },
    enabled: !!storeId,
    staleTime: 60_000,
  });
}

export function useHourlySales(storeId: string | undefined, params?: ReportParams) {
  return useQuery({
    queryKey: ['pos', 'reports', 'hourly-sales', storeId, params],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<HourlySale[]>>(
        `/pos/reports/store/${storeId}/hourly-sales`,
        { params },
      );
      return data.data;
    },
    enabled: !!storeId,
    staleTime: 60_000,
  });
}

export function useCashierPerformance(storeId: string | undefined, params?: ReportParams) {
  return useQuery({
    queryKey: ['pos', 'reports', 'cashier-performance', storeId, params],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<CashierPerformance[]>>(
        `/pos/reports/store/${storeId}/cashier-performance`,
        { params },
      );
      return data.data;
    },
    enabled: !!storeId,
    staleTime: 60_000,
  });
}

export function usePaymentBreakdown(storeId: string | undefined, params?: ReportParams) {
  return useQuery({
    queryKey: ['pos', 'reports', 'payment-breakdown', storeId, params],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PaymentBreakdown[]>>(
        `/pos/reports/store/${storeId}/payment-breakdown`,
        { params },
      );
      return data.data;
    },
    enabled: !!storeId,
    staleTime: 60_000,
  });
}

export function useShiftSummary(shiftId: string | undefined) {
  return useQuery({
    queryKey: ['pos', 'reports', 'shift-summary', shiftId],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ShiftSummary>>(
        `/pos/reports/shift/${shiftId}/summary`,
      );
      return data.data;
    },
    enabled: !!shiftId,
    staleTime: 30_000,
  });
}
