import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

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

export function useMyPerformance() {
  return useQuery({
    queryKey: ['vendor-performance'],
    queryFn: async () => {
      const { data } = await api.get('/stores/performance/me');
      return data.data as PerformanceMetrics;
    },
  });
}

export function useMyPerformanceHistory(days = 30) {
  return useQuery({
    queryKey: ['vendor-performance-history', days],
    queryFn: async () => {
      const { data } = await api.get(`/stores/performance/me/history?days=${days}`);
      return data.data as PerformanceHistory[];
    },
  });
}

export function usePerformanceBenchmarks() {
  return useQuery({
    queryKey: ['vendor-performance-benchmarks'],
    queryFn: async () => {
      const { data } = await api.get('/stores/performance/me/benchmarks');
      return data.data as PerformanceBenchmarks;
    },
  });
}
