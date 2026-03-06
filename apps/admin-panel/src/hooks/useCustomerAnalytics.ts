import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

// ── Types ───────────────────────────────────────────────────────────────

export interface CustomerOverview {
  total_customers: number;
  total_customers_change: number;
  active_customers: number;
  active_customers_change: number;
  new_customers_30d: number;
  new_customers_change: number;
  avg_order_value: number;
  avg_order_value_change: number;
  avg_orders_per_customer: number;
  avg_orders_per_customer_change: number;
  customer_lifetime_value: number;
  customer_lifetime_value_change: number;
  churn_rate: number;
  churn_rate_change: number;
  nps_score: number;
  nps_score_change: number;
}

export interface DemographicBreakdown {
  age_groups: { group: string; count: number; percentage: number }[];
  gender: { gender: string; count: number; percentage: number }[];
  cities: { city: string; count: number; percentage: number; avg_order_value: number }[];
  device_types: { device: string; count: number; percentage: number }[];
  preferred_payment: { method: string; count: number; percentage: number }[];
}

export interface AcquisitionChannel {
  channel: string;
  customers: number;
  percentage: number;
  cost_per_acquisition: number;
  conversion_rate: number;
  avg_first_order_value: number;
  retention_30d: number;
}

export interface RetentionCohort {
  cohort_month: string;
  total_users: number;
  month_1: number;
  month_2: number;
  month_3: number;
  month_4: number;
  month_5: number;
  month_6: number;
}

export interface CustomerSegment {
  id: string;
  name: string;
  description: string;
  customer_count: number;
  percentage: number;
  avg_order_value: number;
  avg_orders_per_month: number;
  avg_lifetime_value: number;
  churn_risk: 'low' | 'medium' | 'high';
  color: string;
}

export interface CustomerGrowth {
  date: string;
  new_customers: number;
  returning_customers: number;
  churned_customers: number;
}

// ── Constants ───────────────────────────────────────────────────────────

export const CHURN_RISK_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800',
};

// ── Hooks ───────────────────────────────────────────────────────────────

export function useCustomerOverview() {
  return useQuery({
    queryKey: ['admin', 'customer-analytics', 'overview'],
    queryFn: async () => {
      const { data } = await api.get('/admin/analytics/customers/overview');
      return data.data as CustomerOverview;
    },
  });
}

export function useDemographics() {
  return useQuery({
    queryKey: ['admin', 'customer-analytics', 'demographics'],
    queryFn: async () => {
      const { data } = await api.get('/admin/analytics/customers/demographics');
      return data.data as DemographicBreakdown;
    },
  });
}

export function useAcquisitionChannels() {
  return useQuery({
    queryKey: ['admin', 'customer-analytics', 'acquisition'],
    queryFn: async () => {
      const { data } = await api.get('/admin/analytics/customers/acquisition');
      return data.data as AcquisitionChannel[];
    },
  });
}

export function useRetentionCohorts() {
  return useQuery({
    queryKey: ['admin', 'customer-analytics', 'retention'],
    queryFn: async () => {
      const { data } = await api.get('/admin/analytics/customers/retention');
      return data.data as RetentionCohort[];
    },
  });
}

export function useCustomerSegments() {
  return useQuery({
    queryKey: ['admin', 'customer-analytics', 'segments'],
    queryFn: async () => {
      const { data } = await api.get('/admin/analytics/customers/segments');
      return data.data as CustomerSegment[];
    },
  });
}

export function useCustomerGrowth() {
  return useQuery({
    queryKey: ['admin', 'customer-analytics', 'growth'],
    queryFn: async () => {
      const { data } = await api.get('/admin/analytics/customers/growth');
      return data.data as CustomerGrowth[];
    },
  });
}
