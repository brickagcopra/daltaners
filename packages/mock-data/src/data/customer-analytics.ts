// ── Customer Analytics Mock Data ─────────────────────────────────────────

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

// ── Overview KPIs ───────────────────────────────────────────────────────
export const customerOverview: CustomerOverview = {
  total_customers: 89420,
  total_customers_change: 14.2,
  active_customers: 42180,
  active_customers_change: 8.5,
  new_customers_30d: 4520,
  new_customers_change: 11.3,
  avg_order_value: 785,
  avg_order_value_change: 3.2,
  avg_orders_per_customer: 4.8,
  avg_orders_per_customer_change: 1.5,
  customer_lifetime_value: 12450,
  customer_lifetime_value_change: 6.8,
  churn_rate: 4.2,
  churn_rate_change: -0.8,
  nps_score: 62,
  nps_score_change: 4,
};

// ── Demographics ────────────────────────────────────────────────────────
export const demographics: DemographicBreakdown = {
  age_groups: [
    { group: '18-24', count: 17884, percentage: 20.0 },
    { group: '25-34', count: 30203, percentage: 33.8 },
    { group: '35-44', count: 21461, percentage: 24.0 },
    { group: '45-54', count: 11425, percentage: 12.8 },
    { group: '55-64', count: 5365, percentage: 6.0 },
    { group: '65+', count: 3082, percentage: 3.4 },
  ],
  gender: [
    { gender: 'Female', count: 47493, percentage: 53.1 },
    { gender: 'Male', count: 38191, percentage: 42.7 },
    { gender: 'Other/Unspecified', count: 3736, percentage: 4.2 },
  ],
  cities: [
    { city: 'Metro Manila', count: 35768, percentage: 40.0, avg_order_value: 920 },
    { city: 'Cebu City', count: 14307, percentage: 16.0, avg_order_value: 680 },
    { city: 'Davao City', count: 11624, percentage: 13.0, avg_order_value: 650 },
    { city: 'Quezon City', count: 8942, percentage: 10.0, avg_order_value: 850 },
    { city: 'Makati', count: 7154, percentage: 8.0, avg_order_value: 1120 },
    { city: 'Taguig', count: 5365, percentage: 6.0, avg_order_value: 980 },
    { city: 'Pasig', count: 3577, percentage: 4.0, avg_order_value: 780 },
    { city: 'Others', count: 2683, percentage: 3.0, avg_order_value: 540 },
  ],
  device_types: [
    { device: 'Android', count: 50553, percentage: 56.5 },
    { device: 'iOS', count: 24836, percentage: 27.8 },
    { device: 'Web Desktop', count: 9836, percentage: 11.0 },
    { device: 'Web Mobile', count: 4195, percentage: 4.7 },
  ],
  preferred_payment: [
    { method: 'GCash', count: 33382, percentage: 37.3 },
    { method: 'Cash on Delivery', count: 22355, percentage: 25.0 },
    { method: 'Credit Card', count: 15196, percentage: 17.0 },
    { method: 'Maya', count: 10731, percentage: 12.0 },
    { method: 'Bank Transfer', count: 4471, percentage: 5.0 },
    { method: 'GrabPay', count: 3285, percentage: 3.7 },
  ],
};

// ── Acquisition Channels ────────────────────────────────────────────────
export const acquisitionChannels: AcquisitionChannel[] = [
  {
    channel: 'Organic Search',
    customers: 25032,
    percentage: 28.0,
    cost_per_acquisition: 0,
    conversion_rate: 3.2,
    avg_first_order_value: 650,
    retention_30d: 45.2,
  },
  {
    channel: 'Facebook Ads',
    customers: 20568,
    percentage: 23.0,
    cost_per_acquisition: 85,
    conversion_rate: 4.8,
    avg_first_order_value: 720,
    retention_30d: 38.5,
  },
  {
    channel: 'Referral Program',
    customers: 16096,
    percentage: 18.0,
    cost_per_acquisition: 150,
    conversion_rate: 12.5,
    avg_first_order_value: 880,
    retention_30d: 62.1,
  },
  {
    channel: 'TikTok Ads',
    customers: 10731,
    percentage: 12.0,
    cost_per_acquisition: 65,
    conversion_rate: 2.8,
    avg_first_order_value: 580,
    retention_30d: 32.4,
  },
  {
    channel: 'Google Ads',
    customers: 8048,
    percentage: 9.0,
    cost_per_acquisition: 120,
    conversion_rate: 5.2,
    avg_first_order_value: 750,
    retention_30d: 41.8,
  },
  {
    channel: 'Instagram',
    customers: 5365,
    percentage: 6.0,
    cost_per_acquisition: 95,
    conversion_rate: 3.5,
    avg_first_order_value: 690,
    retention_30d: 36.2,
  },
  {
    channel: 'App Store / Play Store',
    customers: 3580,
    percentage: 4.0,
    cost_per_acquisition: 45,
    conversion_rate: 8.1,
    avg_first_order_value: 620,
    retention_30d: 48.7,
  },
];

// ── Retention Cohorts ───────────────────────────────────────────────────
export const retentionCohorts: RetentionCohort[] = [
  { cohort_month: '2025-09', total_users: 3420, month_1: 68.2, month_2: 52.1, month_3: 41.5, month_4: 35.8, month_5: 31.2, month_6: 28.4 },
  { cohort_month: '2025-10', total_users: 3850, month_1: 70.5, month_2: 54.3, month_3: 43.8, month_4: 37.2, month_5: 32.8, month_6: 0 },
  { cohort_month: '2025-11', total_users: 4120, month_1: 72.1, month_2: 55.8, month_3: 44.2, month_4: 38.1, month_5: 0, month_6: 0 },
  { cohort_month: '2025-12', total_users: 5280, month_1: 74.8, month_2: 58.2, month_3: 46.5, month_4: 0, month_5: 0, month_6: 0 },
  { cohort_month: '2026-01', total_users: 4680, month_1: 71.3, month_2: 53.9, month_3: 0, month_4: 0, month_5: 0, month_6: 0 },
  { cohort_month: '2026-02', total_users: 4520, month_1: 69.8, month_2: 0, month_3: 0, month_4: 0, month_5: 0, month_6: 0 },
];

// ── Customer Segments ───────────────────────────────────────────────────
export const customerSegments: CustomerSegment[] = [
  {
    id: 'seg-champions',
    name: 'Champions',
    description: 'High-value, frequent buyers who order regularly and spend above average',
    customer_count: 6254,
    percentage: 7.0,
    avg_order_value: 1450,
    avg_orders_per_month: 8.2,
    avg_lifetime_value: 45800,
    churn_risk: 'low',
    color: '#10B981',
  },
  {
    id: 'seg-loyal',
    name: 'Loyal Customers',
    description: 'Consistent buyers with good order frequency and moderate spend',
    customer_count: 15401,
    percentage: 17.2,
    avg_order_value: 920,
    avg_orders_per_month: 5.4,
    avg_lifetime_value: 24500,
    churn_risk: 'low',
    color: '#3B82F6',
  },
  {
    id: 'seg-potential',
    name: 'Potential Loyalists',
    description: 'Recent customers showing promising ordering patterns',
    customer_count: 12519,
    percentage: 14.0,
    avg_order_value: 780,
    avg_orders_per_month: 3.1,
    avg_lifetime_value: 8900,
    churn_risk: 'medium',
    color: '#8B5CF6',
  },
  {
    id: 'seg-new',
    name: 'New Customers',
    description: 'Signed up within the last 30 days',
    customer_count: 4520,
    percentage: 5.1,
    avg_order_value: 620,
    avg_orders_per_month: 1.8,
    avg_lifetime_value: 1200,
    churn_risk: 'high',
    color: '#F59E0B',
  },
  {
    id: 'seg-atrisk',
    name: 'At Risk',
    description: 'Previously active customers showing declining engagement',
    customer_count: 9836,
    percentage: 11.0,
    avg_order_value: 680,
    avg_orders_per_month: 1.2,
    avg_lifetime_value: 15200,
    churn_risk: 'high',
    color: '#EF4444',
  },
  {
    id: 'seg-hibernating',
    name: 'Hibernating',
    description: 'No orders in the last 60 days but were active before',
    customer_count: 18778,
    percentage: 21.0,
    avg_order_value: 540,
    avg_orders_per_month: 0.3,
    avg_lifetime_value: 8400,
    churn_risk: 'high',
    color: '#6B7280',
  },
  {
    id: 'seg-occasional',
    name: 'Occasional Buyers',
    description: 'Infrequent but returning customers with moderate spend',
    customer_count: 22112,
    percentage: 24.7,
    avg_order_value: 720,
    avg_orders_per_month: 1.5,
    avg_lifetime_value: 6800,
    churn_risk: 'medium',
    color: '#14B8A6',
  },
];

// ── Customer Growth (30 days) ───────────────────────────────────────────
function generateCustomerGrowth(): CustomerGrowth[] {
  const days: CustomerGrowth[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push({
      date: d.toISOString().split('T')[0],
      new_customers: 100 + Math.floor(Math.random() * 200),
      returning_customers: 800 + Math.floor(Math.random() * 600),
      churned_customers: 20 + Math.floor(Math.random() * 40),
    });
  }
  return days;
}

export const customerGrowth: CustomerGrowth[] = generateCustomerGrowth();
