export type PerformanceTier = 'excellent' | 'good' | 'average' | 'poor' | 'critical' | 'unrated';

export interface MockPerformanceMetrics {
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
  // joined fields for admin listing
  store_name?: string;
  store_category?: string;
  store_status?: string;
}

export interface MockPerformanceHistory {
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

export interface MockPerformanceBenchmarks {
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

// ─── Mock Data ─────────────────────────────────────────────────────────────────

export const performanceMetrics: MockPerformanceMetrics[] = [
  {
    store_id: 'store-001',
    total_orders: 1250,
    total_revenue: 487500,
    fulfilled_orders: 1188,
    cancelled_orders: 25,
    fulfillment_rate: 95.04,
    cancellation_rate: 2.0,
    avg_preparation_time_min: 18.5,
    on_time_delivery_rate: 92.3,
    total_returns: 15,
    return_rate: 1.2,
    total_disputes: 8,
    dispute_rate: 0.64,
    escalation_rate: 25.0,
    avg_rating: 4.65,
    review_count: 342,
    review_response_rate: 88.0,
    avg_dispute_response_hours: 6.5,
    performance_score: 91.2,
    performance_tier: 'excellent',
    period_days: 30,
    calculated_at: '2026-03-03T02:00:00Z',
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-03-03T02:00:00Z',
    store_name: 'Aling Nena\'s Sari-Sari',
    store_category: 'grocery',
    store_status: 'active',
  },
  {
    store_id: 'store-002',
    total_orders: 890,
    total_revenue: 312500,
    fulfilled_orders: 801,
    cancelled_orders: 45,
    fulfillment_rate: 90.0,
    cancellation_rate: 5.06,
    avg_preparation_time_min: 22.3,
    on_time_delivery_rate: 85.5,
    total_returns: 22,
    return_rate: 2.47,
    total_disputes: 12,
    dispute_rate: 1.35,
    escalation_rate: 33.3,
    avg_rating: 4.2,
    review_count: 198,
    review_response_rate: 72.0,
    avg_dispute_response_hours: 14.2,
    performance_score: 78.5,
    performance_tier: 'good',
    period_days: 30,
    calculated_at: '2026-03-03T02:00:00Z',
    created_at: '2026-01-20T10:00:00Z',
    updated_at: '2026-03-03T02:00:00Z',
    store_name: 'Metro Fresh Market',
    store_category: 'grocery',
    store_status: 'active',
  },
  {
    store_id: 'store-003',
    total_orders: 450,
    total_revenue: 157500,
    fulfilled_orders: 360,
    cancelled_orders: 36,
    fulfillment_rate: 80.0,
    cancellation_rate: 8.0,
    avg_preparation_time_min: 35.0,
    on_time_delivery_rate: 68.0,
    total_returns: 18,
    return_rate: 4.0,
    total_disputes: 15,
    dispute_rate: 3.33,
    escalation_rate: 46.7,
    avg_rating: 3.5,
    review_count: 87,
    review_response_rate: 45.0,
    avg_dispute_response_hours: 28.0,
    performance_score: 55.3,
    performance_tier: 'average',
    period_days: 30,
    calculated_at: '2026-03-03T02:00:00Z',
    created_at: '2026-02-01T10:00:00Z',
    updated_at: '2026-03-03T02:00:00Z',
    store_name: 'Kusina ni Juan',
    store_category: 'restaurant',
    store_status: 'active',
  },
  {
    store_id: 'store-004',
    total_orders: 200,
    total_revenue: 85000,
    fulfilled_orders: 130,
    cancelled_orders: 30,
    fulfillment_rate: 65.0,
    cancellation_rate: 15.0,
    avg_preparation_time_min: 45.0,
    on_time_delivery_rate: 50.0,
    total_returns: 20,
    return_rate: 10.0,
    total_disputes: 18,
    dispute_rate: 9.0,
    escalation_rate: 61.1,
    avg_rating: 2.8,
    review_count: 42,
    review_response_rate: 20.0,
    avg_dispute_response_hours: 48.0,
    performance_score: 32.1,
    performance_tier: 'poor',
    period_days: 30,
    calculated_at: '2026-03-03T02:00:00Z',
    created_at: '2026-02-10T10:00:00Z',
    updated_at: '2026-03-03T02:00:00Z',
    store_name: 'FastBuy Electronics',
    store_category: 'electronics',
    store_status: 'active',
  },
  {
    store_id: 'store-005',
    total_orders: 680,
    total_revenue: 238000,
    fulfilled_orders: 625,
    cancelled_orders: 20,
    fulfillment_rate: 91.9,
    cancellation_rate: 2.94,
    avg_preparation_time_min: 15.0,
    on_time_delivery_rate: 90.0,
    total_returns: 8,
    return_rate: 1.18,
    total_disputes: 5,
    dispute_rate: 0.74,
    escalation_rate: 20.0,
    avg_rating: 4.8,
    review_count: 210,
    review_response_rate: 95.0,
    avg_dispute_response_hours: 4.0,
    performance_score: 93.7,
    performance_tier: 'excellent',
    period_days: 30,
    calculated_at: '2026-03-03T02:00:00Z',
    created_at: '2026-01-10T10:00:00Z',
    updated_at: '2026-03-03T02:00:00Z',
    store_name: 'HealthPlus Pharmacy',
    store_category: 'pharmacy',
    store_status: 'active',
  },
  {
    store_id: 'store-006',
    total_orders: 3,
    total_revenue: 1200,
    fulfilled_orders: 3,
    cancelled_orders: 0,
    fulfillment_rate: 100,
    cancellation_rate: 0,
    avg_preparation_time_min: 20,
    on_time_delivery_rate: 100,
    total_returns: 0,
    return_rate: 0,
    total_disputes: 0,
    dispute_rate: 0,
    escalation_rate: 0,
    avg_rating: 0,
    review_count: 0,
    review_response_rate: 0,
    avg_dispute_response_hours: 0,
    performance_score: 0,
    performance_tier: 'unrated',
    period_days: 30,
    calculated_at: '2026-03-03T02:00:00Z',
    created_at: '2026-02-25T10:00:00Z',
    updated_at: '2026-03-03T02:00:00Z',
    store_name: 'New Store PH',
    store_category: 'general',
    store_status: 'active',
  },
];

// Generate 30 days of history for the current vendor
export function generatePerformanceHistory(storeId: string): MockPerformanceHistory[] {
  const history: MockPerformanceHistory[] = [];
  const base = performanceMetrics.find((m) => m.store_id === storeId) || performanceMetrics[0];

  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const variance = () => (Math.random() - 0.5) * 6; // +/- 3 points variance

    history.push({
      id: `hist-${storeId}-${i}`,
      store_id: storeId,
      snapshot_date: dateStr,
      total_orders: Math.max(0, Math.round(base.total_orders / 30 + (Math.random() - 0.5) * 10)),
      total_revenue: Math.max(0, Math.round(base.total_revenue / 30 + (Math.random() - 0.5) * 2000)),
      fulfillment_rate: Math.min(100, Math.max(0, parseFloat((base.fulfillment_rate + variance()).toFixed(1)))),
      cancellation_rate: Math.max(0, parseFloat((base.cancellation_rate + Math.random() * 2).toFixed(1))),
      return_rate: Math.max(0, parseFloat((base.return_rate + Math.random() * 1).toFixed(1))),
      dispute_rate: Math.max(0, parseFloat((base.dispute_rate + Math.random() * 0.5).toFixed(2))),
      avg_rating: Math.min(5, Math.max(1, parseFloat((base.avg_rating + (Math.random() - 0.5) * 0.3).toFixed(2)))),
      performance_score: Math.min(100, Math.max(0, parseFloat((base.performance_score + variance()).toFixed(1)))),
      performance_tier: base.performance_tier,
    });
  }

  return history;
}

export const performanceBenchmarks: MockPerformanceBenchmarks = {
  avg_fulfillment_rate: 85.4,
  avg_cancellation_rate: 5.2,
  avg_return_rate: 2.8,
  avg_dispute_rate: 1.9,
  avg_rating: 4.1,
  avg_performance_score: 72.5,
  avg_preparation_time: 24.3,
  total_stores_rated: 142,
  tier_distribution: [
    { tier: 'excellent', count: 28 },
    { tier: 'good', count: 45 },
    { tier: 'average', count: 38 },
    { tier: 'poor', count: 18 },
    { tier: 'critical', count: 5 },
    { tier: 'unrated', count: 8 },
  ],
};
