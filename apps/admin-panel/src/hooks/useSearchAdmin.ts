import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ── Types ───────────────────────────────────────────────────────────────

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

// ── Constants ───────────────────────────────────────────────────────────

export const BOOST_TYPE_LABELS: Record<string, string> = {
  pin: 'Pin to Top',
  boost: 'Boost',
  bury: 'Bury',
  filter: 'Filter',
};

export const BOOST_TYPE_COLORS: Record<string, string> = {
  pin: 'bg-purple-100 text-purple-800',
  boost: 'bg-green-100 text-green-800',
  bury: 'bg-red-100 text-red-800',
  filter: 'bg-blue-100 text-blue-800',
};

export const INDEX_STATUS_COLORS: Record<string, string> = {
  green: 'bg-green-100 text-green-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  red: 'bg-red-100 text-red-800',
};

export const SUGGESTED_ACTION_LABELS: Record<string, string> = {
  add_synonym: 'Add Synonym',
  add_product: 'Add Product',
  ignore: 'Ignore',
};

// ── Query Interfaces ────────────────────────────────────────────────────

interface SynonymQuery {
  page?: number;
  limit?: number;
  search?: string;
  is_active?: string;
}

interface BoostRuleQuery {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  is_active?: string;
}

// ── Hooks ───────────────────────────────────────────────────────────────

export function useSynonyms(query: SynonymQuery = {}) {
  const { page = 1, limit = 20, search, is_active } = query;
  return useQuery({
    queryKey: ['admin', 'search-synonyms', page, limit, search, is_active],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (search) params.set('search', search);
      if (is_active !== undefined && is_active !== '') params.set('is_active', is_active);
      const { data } = await api.get(`/admin/search/synonyms?${params}`);
      return data as {
        success: boolean;
        data: SearchSynonym[];
        meta: { page: number; limit: number; total: number; totalPages: number };
      };
    },
  });
}

export function useCreateSynonym() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { term: string; synonyms: string[] }) => {
      const { data } = await api.post('/admin/search/synonyms', body);
      return data.data as SearchSynonym;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'search-synonyms'] }),
  });
}

export function useUpdateSynonym() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string } & Partial<SearchSynonym>) => {
      const { data } = await api.patch(`/admin/search/synonyms/${id}`, body);
      return data.data as SearchSynonym;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'search-synonyms'] }),
  });
}

export function useDeleteSynonym() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/search/synonyms/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'search-synonyms'] }),
  });
}

export function useBoostRules(query: BoostRuleQuery = {}) {
  const { page = 1, limit = 20, search, type, is_active } = query;
  return useQuery({
    queryKey: ['admin', 'search-boost-rules', page, limit, search, type, is_active],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (search) params.set('search', search);
      if (type) params.set('type', type);
      if (is_active !== undefined && is_active !== '') params.set('is_active', is_active);
      const { data } = await api.get(`/admin/search/boost-rules?${params}`);
      return data as {
        success: boolean;
        data: BoostRule[];
        meta: { page: number; limit: number; total: number; totalPages: number };
      };
    },
  });
}

export function useCreateBoostRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Omit<BoostRule, 'id' | 'created_at' | 'updated_at'>) => {
      const { data } = await api.post('/admin/search/boost-rules', body);
      return data.data as BoostRule;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'search-boost-rules'] }),
  });
}

export function useUpdateBoostRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string } & Partial<BoostRule>) => {
      const { data } = await api.patch(`/admin/search/boost-rules/${id}`, body);
      return data.data as BoostRule;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'search-boost-rules'] }),
  });
}

export function useDeleteBoostRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/search/boost-rules/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'search-boost-rules'] }),
  });
}

export function useSearchAnalytics() {
  return useQuery({
    queryKey: ['admin', 'search-analytics'],
    queryFn: async () => {
      const { data } = await api.get('/admin/search/analytics');
      return data.data as SearchAnalytics;
    },
  });
}

export function useIndexHealth() {
  return useQuery({
    queryKey: ['admin', 'index-health'],
    queryFn: async () => {
      const { data } = await api.get('/admin/search/index-health');
      return data.data as IndexHealth[];
    },
  });
}

export function useReindex() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (indexName: string) => {
      const { data } = await api.post(`/admin/search/reindex/${indexName}`);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'index-health'] }),
  });
}
