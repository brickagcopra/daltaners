// ── Search Management Mock Data ─────────────────────────────────────────

export interface SearchSynonym {
  id: string;
  term: string;
  synonyms: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BoostRule {
  id: string;
  name: string;
  type: 'pin' | 'boost' | 'bury' | 'filter';
  query_pattern: string;
  target_type: 'product' | 'category' | 'brand' | 'store';
  target_ids: string[];
  target_names: string[];
  boost_value: number;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface TopQuery {
  query: string;
  count: number;
  unique_users: number;
  avg_results: number;
  ctr: number;
  conversion_rate: number;
}

export interface ZeroResultQuery {
  query: string;
  count: number;
  unique_users: number;
  last_searched: string;
  suggested_action: 'add_synonym' | 'add_product' | 'ignore';
}

export interface SearchAnalytics {
  total_searches: number;
  total_searches_change: number;
  unique_searchers: number;
  unique_searchers_change: number;
  avg_ctr: number;
  avg_ctr_change: number;
  zero_result_rate: number;
  zero_result_rate_change: number;
  avg_response_time_ms: number;
  top_queries: TopQuery[];
  zero_result_queries: ZeroResultQuery[];
  searches_by_day: { date: string; searches: number; zero_results: number }[];
}

export interface IndexHealth {
  index_name: string;
  status: 'green' | 'yellow' | 'red';
  doc_count: number;
  store_size_mb: number;
  primary_shards: number;
  replica_shards: number;
  last_synced: string;
  sync_lag_seconds: number;
  pending_docs: number;
}

// ── Synonyms ────────────────────────────────────────────────────────────
export const searchSynonyms: SearchSynonym[] = [
  {
    id: 'syn-001',
    term: 'bigas',
    synonyms: ['rice', 'sinangag', 'kanin'],
    is_active: true,
    created_at: '2025-08-01T08:00:00Z',
    updated_at: '2025-10-15T10:30:00Z',
  },
  {
    id: 'syn-002',
    term: 'gatas',
    synonyms: ['milk', 'fresh milk', 'powdered milk'],
    is_active: true,
    created_at: '2025-08-01T08:00:00Z',
    updated_at: '2025-09-20T14:00:00Z',
  },
  {
    id: 'syn-003',
    term: 'sabon',
    synonyms: ['soap', 'detergent', 'panlaba'],
    is_active: true,
    created_at: '2025-08-05T09:00:00Z',
    updated_at: '2025-11-01T11:00:00Z',
  },
  {
    id: 'syn-004',
    term: 'kape',
    synonyms: ['coffee', 'kapeng barako', '3-in-1'],
    is_active: true,
    created_at: '2025-08-10T07:30:00Z',
    updated_at: '2025-08-10T07:30:00Z',
  },
  {
    id: 'syn-005',
    term: 'softdrinks',
    synonyms: ['soda', 'cola', 'carbonated drinks', 'soft drinks'],
    is_active: true,
    created_at: '2025-08-15T06:00:00Z',
    updated_at: '2025-12-01T08:00:00Z',
  },
  {
    id: 'syn-006',
    term: 'toyo',
    synonyms: ['soy sauce', 'soya sauce'],
    is_active: true,
    created_at: '2025-09-01T10:00:00Z',
    updated_at: '2025-09-01T10:00:00Z',
  },
  {
    id: 'syn-007',
    term: 'shampoo',
    synonyms: ['hair wash', 'conditioner', 'hair care'],
    is_active: false,
    created_at: '2025-09-10T12:00:00Z',
    updated_at: '2025-11-20T09:45:00Z',
  },
  {
    id: 'syn-008',
    term: 'diaper',
    synonyms: ['nappies', 'lampin', 'diapers'],
    is_active: true,
    created_at: '2025-09-15T08:30:00Z',
    updated_at: '2025-09-15T08:30:00Z',
  },
  {
    id: 'syn-009',
    term: 'manok',
    synonyms: ['chicken', 'poultry', 'dressed chicken'],
    is_active: true,
    created_at: '2025-10-01T07:00:00Z',
    updated_at: '2025-10-01T07:00:00Z',
  },
  {
    id: 'syn-010',
    term: 'sardinas',
    synonyms: ['sardines', 'canned fish', 'de lata'],
    is_active: true,
    created_at: '2025-10-10T09:00:00Z',
    updated_at: '2026-01-05T11:00:00Z',
  },
  {
    id: 'syn-011',
    term: 'gamot',
    synonyms: ['medicine', 'otc', 'over the counter', 'pharmaceutical'],
    is_active: true,
    created_at: '2025-10-20T10:00:00Z',
    updated_at: '2025-10-20T10:00:00Z',
  },
  {
    id: 'syn-012',
    term: 'noodles',
    synonyms: ['pancit', 'instant noodles', 'pasta', 'mami'],
    is_active: true,
    created_at: '2025-11-01T08:00:00Z',
    updated_at: '2025-11-01T08:00:00Z',
  },
];

// ── Boost Rules ─────────────────────────────────────────────────────────
export const boostRules: BoostRule[] = [
  {
    id: 'br-001',
    name: 'Holiday Rice Promo',
    type: 'boost',
    query_pattern: 'bigas*',
    target_type: 'product',
    target_ids: ['prod-001', 'prod-002'],
    target_names: ['Jasmine Rice 25kg', 'Sinandomeng Rice 5kg'],
    boost_value: 10,
    is_active: true,
    start_date: '2025-12-01T00:00:00Z',
    end_date: '2026-01-31T23:59:59Z',
    created_at: '2025-11-25T10:00:00Z',
    updated_at: '2025-11-25T10:00:00Z',
  },
  {
    id: 'br-002',
    name: 'Pin Lucky Me Noodles',
    type: 'pin',
    query_pattern: 'noodles',
    target_type: 'brand',
    target_ids: ['brand-lucky-me'],
    target_names: ['Lucky Me!'],
    boost_value: 100,
    is_active: true,
    start_date: null,
    end_date: null,
    created_at: '2025-10-01T08:00:00Z',
    updated_at: '2025-10-01T08:00:00Z',
  },
  {
    id: 'br-003',
    name: 'Bury Low-Rated Stores',
    type: 'bury',
    query_pattern: '*',
    target_type: 'store',
    target_ids: ['store-low-001'],
    target_names: ['Quick Mart BGC'],
    boost_value: -50,
    is_active: true,
    start_date: null,
    end_date: null,
    created_at: '2025-09-15T14:00:00Z',
    updated_at: '2026-01-10T09:00:00Z',
  },
  {
    id: 'br-004',
    name: 'Summer Drinks Boost',
    type: 'boost',
    query_pattern: 'drinks|juice|water',
    target_type: 'category',
    target_ids: ['cat-beverages'],
    target_names: ['Beverages'],
    boost_value: 15,
    is_active: false,
    start_date: '2025-03-01T00:00:00Z',
    end_date: '2025-05-31T23:59:59Z',
    created_at: '2025-02-20T08:00:00Z',
    updated_at: '2025-06-01T00:00:00Z',
  },
  {
    id: 'br-005',
    name: 'Pharmacy Filter Rx',
    type: 'filter',
    query_pattern: 'prescription*',
    target_type: 'category',
    target_ids: ['cat-pharmacy-rx'],
    target_names: ['Prescription Drugs'],
    boost_value: 0,
    is_active: true,
    start_date: null,
    end_date: null,
    created_at: '2025-08-01T09:00:00Z',
    updated_at: '2025-08-01T09:00:00Z',
  },
  {
    id: 'br-006',
    name: 'Boost Filipino Snacks',
    type: 'boost',
    query_pattern: 'snack*|chicharon|polvoron|pastillas',
    target_type: 'category',
    target_ids: ['cat-filipino-snacks'],
    target_names: ['Filipino Snacks'],
    boost_value: 8,
    is_active: true,
    start_date: null,
    end_date: null,
    created_at: '2025-10-15T11:00:00Z',
    updated_at: '2025-10-15T11:00:00Z',
  },
];

// ── Search Analytics ────────────────────────────────────────────────────
function generateSearchesByDay(): { date: string; searches: number; zero_results: number }[] {
  const days: { date: string; searches: number; zero_results: number }[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const searches = 2000 + Math.floor(Math.random() * 3000);
    days.push({
      date: d.toISOString().split('T')[0],
      searches,
      zero_results: Math.floor(searches * (0.04 + Math.random() * 0.06)),
    });
  }
  return days;
}

export const searchAnalytics: SearchAnalytics = {
  total_searches: 142850,
  total_searches_change: 12.4,
  unique_searchers: 45230,
  unique_searchers_change: 8.7,
  avg_ctr: 34.2,
  avg_ctr_change: 2.1,
  zero_result_rate: 5.8,
  zero_result_rate_change: -0.9,
  avg_response_time_ms: 42,
  top_queries: [
    { query: 'bigas', count: 8420, unique_users: 3210, avg_results: 45, ctr: 42.5, conversion_rate: 18.3 },
    { query: 'gatas', count: 6890, unique_users: 2780, avg_results: 38, ctr: 38.1, conversion_rate: 15.7 },
    { query: 'chicken', count: 5640, unique_users: 2340, avg_results: 52, ctr: 35.8, conversion_rate: 14.2 },
    { query: 'diaper', count: 4920, unique_users: 1890, avg_results: 28, ctr: 44.2, conversion_rate: 22.1 },
    { query: 'coke', count: 4380, unique_users: 2150, avg_results: 15, ctr: 52.3, conversion_rate: 28.4 },
    { query: 'sardines', count: 3850, unique_users: 1670, avg_results: 22, ctr: 40.1, conversion_rate: 19.6 },
    { query: 'shampoo', count: 3620, unique_users: 1540, avg_results: 35, ctr: 33.7, conversion_rate: 12.8 },
    { query: 'instant noodles', count: 3410, unique_users: 1420, avg_results: 41, ctr: 36.5, conversion_rate: 16.3 },
    { query: 'toyo', count: 2980, unique_users: 1280, avg_results: 12, ctr: 48.9, conversion_rate: 25.1 },
    { query: 'pandesal', count: 2750, unique_users: 1150, avg_results: 8, ctr: 55.2, conversion_rate: 30.5 },
    { query: 'asukal', count: 2540, unique_users: 1090, avg_results: 18, ctr: 41.3, conversion_rate: 20.2 },
    { query: 'sabong panlaba', count: 2310, unique_users: 980, avg_results: 25, ctr: 37.8, conversion_rate: 17.4 },
    { query: 'kape', count: 2180, unique_users: 920, avg_results: 30, ctr: 39.5, conversion_rate: 16.8 },
    { query: 'corned beef', count: 2050, unique_users: 870, avg_results: 14, ctr: 46.7, conversion_rate: 23.9 },
    { query: 'tissue', count: 1920, unique_users: 810, avg_results: 20, ctr: 43.1, conversion_rate: 21.5 },
  ],
  zero_result_queries: [
    { query: 'lechon cebu', count: 245, unique_users: 180, last_searched: '2026-03-03T14:30:00Z', suggested_action: 'add_product' },
    { query: 'masarap na ulam', count: 189, unique_users: 142, last_searched: '2026-03-03T12:15:00Z', suggested_action: 'add_synonym' },
    { query: 'korean ramen', count: 156, unique_users: 98, last_searched: '2026-03-02T18:45:00Z', suggested_action: 'add_product' },
    { query: 'organic vegetables', count: 134, unique_users: 87, last_searched: '2026-03-03T09:20:00Z', suggested_action: 'add_product' },
    { query: 'wagyu beef', count: 112, unique_users: 65, last_searched: '2026-03-01T20:10:00Z', suggested_action: 'add_product' },
    { query: 'glutathione supplement', count: 98, unique_users: 72, last_searched: '2026-03-02T11:30:00Z', suggested_action: 'add_product' },
    { query: 'bidet spray', count: 87, unique_users: 54, last_searched: '2026-03-01T15:45:00Z', suggested_action: 'ignore' },
    { query: 'matcha latte', count: 76, unique_users: 48, last_searched: '2026-03-03T07:00:00Z', suggested_action: 'add_synonym' },
    { query: 'vegan cheese', count: 65, unique_users: 41, last_searched: '2026-02-28T16:20:00Z', suggested_action: 'add_product' },
    { query: 'kombucha', count: 54, unique_users: 32, last_searched: '2026-03-02T10:00:00Z', suggested_action: 'add_product' },
  ],
  searches_by_day: generateSearchesByDay(),
};

// ── Index Health ─────────────────────────────────────────────────────────
export const indexHealth: IndexHealth[] = [
  {
    index_name: 'daltaners-products',
    status: 'green',
    doc_count: 28450,
    store_size_mb: 156.8,
    primary_shards: 3,
    replica_shards: 1,
    last_synced: '2026-03-04T08:45:00Z',
    sync_lag_seconds: 2,
    pending_docs: 0,
  },
  {
    index_name: 'daltaners-stores',
    status: 'green',
    doc_count: 1245,
    store_size_mb: 12.4,
    primary_shards: 1,
    replica_shards: 1,
    last_synced: '2026-03-04T08:44:58Z',
    sync_lag_seconds: 4,
    pending_docs: 0,
  },
  {
    index_name: 'daltaners-categories',
    status: 'green',
    doc_count: 342,
    store_size_mb: 2.1,
    primary_shards: 1,
    replica_shards: 1,
    last_synced: '2026-03-04T08:44:55Z',
    sync_lag_seconds: 7,
    pending_docs: 0,
  },
  {
    index_name: 'daltaners-brands',
    status: 'yellow',
    doc_count: 580,
    store_size_mb: 4.6,
    primary_shards: 1,
    replica_shards: 1,
    last_synced: '2026-03-04T08:30:00Z',
    sync_lag_seconds: 902,
    pending_docs: 12,
  },
  {
    index_name: 'daltaners-search-suggestions',
    status: 'green',
    doc_count: 15200,
    store_size_mb: 8.3,
    primary_shards: 1,
    replica_shards: 1,
    last_synced: '2026-03-04T08:44:50Z',
    sync_lag_seconds: 12,
    pending_docs: 0,
  },
];
