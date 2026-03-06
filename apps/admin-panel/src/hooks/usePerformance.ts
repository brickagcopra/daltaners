import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';

export type PerformanceTier = 'excellent' | 'good' | 'average' | 'poor' | 'critical' | 'unrated';

export interface PerformanceMetrics {
  store_id: string;
  total_orders: number;
  total_revenue: number;
  fulfilled_orders: number;
  cancelled_orders: number;
  fulfillment_rate: number;
  cancellation_rate: number;
  avg_preparation_time_min: number;
  on_time_delivery_rate: number;
  total_returns: number;
  return_rate: number;
  total_disputes: number;
  dispute_rate: number;
  escalation_rate: number;
  avg_rating: number;
  review_count: number;
  review_response_rate: number;
  avg_dispute_response_hours: number;
  performance_score: number;
  performance_tier: PerformanceTier;
  period_days: number;
  calculated_at: string;
  created_at: string;
  updated_at: string;
  store_name?: string;
  store_category?: string;
  store_status?: string;
}

export interface PerformanceHistory {
  id: string;
  store_id: string;
  snapshot_date: string;
  total_orders: number;
  total_revenue: number;
  fulfillment_rate: number;
  cancellation_rate: number;
  return_rate: number;
  dispute_rate: number;
  avg_rating: number;
  performance_score: number;
  performance_tier: PerformanceTier;
}

export interface PerformanceBenchmarks {
  avg_fulfillment_rate: number;
  avg_cancellation_rate: number;
  avg_return_rate: number;
  avg_dispute_rate: number;
  avg_rating: number;
  avg_performance_score: number;
  avg_preparation_time: number;
  total_stores_rated: number;
  tier_distribution: { tier: string; count: number }[];
}

interface AdminPerformanceQuery {
  page?: number;
  limit?: number;
  search?: string;
  tier?: string;
  category?: string;
  sort_by?: string;
  sort_order?: string;
  min_score?: number;
  max_score?: number;
}

export function useAdminPerformanceList(query: AdminPerformanceQuery = {}) {
  const { page = 1, limit = 20, search, tier, category, sort_by, sort_order, min_score, max_score } = query;
  return useQuery({
    queryKey: ['admin-performance', page, limit, search, tier, category, sort_by, sort_order, min_score, max_score],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (search) params.set('search', search);
      if (tier) params.set('tier', tier);
      if (category) params.set('category', category);
      if (sort_by) params.set('sort_by', sort_by);
      if (sort_order) params.set('sort_order', sort_order);
      if (min_score !== undefined) params.set('min_score', String(min_score));
      if (max_score !== undefined) params.set('max_score', String(max_score));
      const { data } = await api.get(`/admin/performance?${params}`);
      return data as {
        success: boolean;
        data: PerformanceMetrics[];
        meta: { page: number; limit: number; total: number; totalPages: number };
      };
    },
  });
}

export function useAdminPerformanceBenchmarks() {
  return useQuery({
    queryKey: ['admin-performance-benchmarks'],
    queryFn: async () => {
      const { data } = await api.get('/admin/performance/benchmarks');
      return data.data as PerformanceBenchmarks;
    },
  });
}

export function useAdminTopPerformers(limit = 10) {
  return useQuery({
    queryKey: ['admin-performance-top', limit],
    queryFn: async () => {
      const { data } = await api.get(`/admin/performance/top?limit=${limit}`);
      return data.data as PerformanceMetrics[];
    },
  });
}

export function useAdminBottomPerformers(limit = 10) {
  return useQuery({
    queryKey: ['admin-performance-bottom', limit],
    queryFn: async () => {
      const { data } = await api.get(`/admin/performance/bottom?limit=${limit}`);
      return data.data as PerformanceMetrics[];
    },
  });
}

export function useAdminStorePerformance(storeId: string | null) {
  return useQuery({
    queryKey: ['admin-performance-store', storeId],
    queryFn: async () => {
      const { data } = await api.get(`/admin/performance/stores/${storeId}`);
      return data.data as PerformanceMetrics;
    },
    enabled: !!storeId,
  });
}

export function useAdminStorePerformanceHistory(storeId: string | null, days = 30) {
  return useQuery({
    queryKey: ['admin-performance-store-history', storeId, days],
    queryFn: async () => {
      const { data } = await api.get(`/admin/performance/stores/${storeId}/history?days=${days}`);
      return data.data as PerformanceHistory[];
    },
    enabled: !!storeId,
  });
}

export function useRecalculateAllPerformance() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/admin/performance/recalculate');
      return data.data as { stores_processed: number };
    },
  });
}

export function useRecalculateStorePerformance() {
  return useMutation({
    mutationFn: async (storeId: string) => {
      const { data } = await api.post(`/admin/performance/stores/${storeId}/recalculate`);
      return data.data as PerformanceMetrics;
    },
  });
}
