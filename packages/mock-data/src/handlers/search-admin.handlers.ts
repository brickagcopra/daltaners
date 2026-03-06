import { http, delay } from 'msw';
import { wrap, paginatedWrap, errorResponse, getSearchParams } from '../helpers';
import {
  searchSynonyms,
  boostRules,
  searchAnalytics,
  indexHealth,
} from '../data/search-admin';
import type { SearchSynonym, BoostRule } from '../data/search-admin';

const BASE = '/api/v1';

export const searchAdminHandlers = [
  // ── Synonyms: GET list (paginated) ────────────────────────────────────
  ...[
    `${BASE}/admin/search/synonyms`,
    `${BASE}/catalog/admin/search/synonyms`,
  ].map((path) =>
    http.get(path, async ({ request }) => {
      await delay(300);
      const params = getSearchParams(request);
      const page = parseInt(params.get('page') ?? '1', 10);
      const limit = parseInt(params.get('limit') ?? '20', 10);
      const search = params.get('search')?.toLowerCase();
      const isActive = params.get('is_active');

      let filtered = [...searchSynonyms];

      if (search) {
        filtered = filtered.filter(
          (s) =>
            s.term.toLowerCase().includes(search) ||
            s.synonyms.some((syn) => syn.toLowerCase().includes(search)),
        );
      }

      if (isActive === 'true') {
        filtered = filtered.filter((s) => s.is_active);
      } else if (isActive === 'false') {
        filtered = filtered.filter((s) => !s.is_active);
      }

      return paginatedWrap(filtered, page, limit);
    }),
  ),

  // ── Synonyms: POST create ─────────────────────────────────────────────
  ...[
    `${BASE}/admin/search/synonyms`,
    `${BASE}/catalog/admin/search/synonyms`,
  ].map((path) =>
    http.post(path, async ({ request }) => {
      await delay(400);
      const body = (await request.json()) as { term: string; synonyms: string[] };
      const newSynonym: SearchSynonym = {
        id: `syn-${Date.now()}`,
        term: body.term,
        synonyms: body.synonyms,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      searchSynonyms.push(newSynonym);
      return wrap(newSynonym);
    }),
  ),

  // ── Synonyms: PATCH update ────────────────────────────────────────────
  ...[
    `${BASE}/admin/search/synonyms/:id`,
    `${BASE}/catalog/admin/search/synonyms/:id`,
  ].map((path) =>
    http.patch(path, async ({ params, request }) => {
      await delay(300);
      const idx = searchSynonyms.findIndex((s) => s.id === params.id);
      if (idx === -1) return errorResponse(404, 'SYNONYM_NOT_FOUND', 'Synonym not found');
      const body = (await request.json()) as Partial<SearchSynonym>;
      searchSynonyms[idx] = {
        ...searchSynonyms[idx],
        ...body,
        updated_at: new Date().toISOString(),
      };
      return wrap(searchSynonyms[idx]);
    }),
  ),

  // ── Synonyms: DELETE ──────────────────────────────────────────────────
  ...[
    `${BASE}/admin/search/synonyms/:id`,
    `${BASE}/catalog/admin/search/synonyms/:id`,
  ].map((path) =>
    http.delete(path, async ({ params }) => {
      await delay(300);
      const idx = searchSynonyms.findIndex((s) => s.id === params.id);
      if (idx === -1) return errorResponse(404, 'SYNONYM_NOT_FOUND', 'Synonym not found');
      searchSynonyms.splice(idx, 1);
      return wrap({ deleted: true });
    }),
  ),

  // ── Boost Rules: GET list (paginated) ─────────────────────────────────
  ...[
    `${BASE}/admin/search/boost-rules`,
    `${BASE}/catalog/admin/search/boost-rules`,
  ].map((path) =>
    http.get(path, async ({ request }) => {
      await delay(300);
      const params = getSearchParams(request);
      const page = parseInt(params.get('page') ?? '1', 10);
      const limit = parseInt(params.get('limit') ?? '20', 10);
      const search = params.get('search')?.toLowerCase();
      const type = params.get('type');
      const isActive = params.get('is_active');

      let filtered = [...boostRules];

      if (search) {
        filtered = filtered.filter(
          (r) =>
            r.name.toLowerCase().includes(search) ||
            r.query_pattern.toLowerCase().includes(search),
        );
      }

      if (type) {
        filtered = filtered.filter((r) => r.type === type);
      }

      if (isActive === 'true') {
        filtered = filtered.filter((r) => r.is_active);
      } else if (isActive === 'false') {
        filtered = filtered.filter((r) => !r.is_active);
      }

      return paginatedWrap(filtered, page, limit);
    }),
  ),

  // ── Boost Rules: POST create ──────────────────────────────────────────
  ...[
    `${BASE}/admin/search/boost-rules`,
    `${BASE}/catalog/admin/search/boost-rules`,
  ].map((path) =>
    http.post(path, async ({ request }) => {
      await delay(400);
      const body = (await request.json()) as Omit<BoostRule, 'id' | 'created_at' | 'updated_at'>;
      const newRule: BoostRule = {
        ...body,
        id: `br-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      boostRules.push(newRule);
      return wrap(newRule);
    }),
  ),

  // ── Boost Rules: PATCH update ─────────────────────────────────────────
  ...[
    `${BASE}/admin/search/boost-rules/:id`,
    `${BASE}/catalog/admin/search/boost-rules/:id`,
  ].map((path) =>
    http.patch(path, async ({ params, request }) => {
      await delay(300);
      const idx = boostRules.findIndex((r) => r.id === params.id);
      if (idx === -1) return errorResponse(404, 'RULE_NOT_FOUND', 'Boost rule not found');
      const body = (await request.json()) as Partial<BoostRule>;
      boostRules[idx] = {
        ...boostRules[idx],
        ...body,
        updated_at: new Date().toISOString(),
      };
      return wrap(boostRules[idx]);
    }),
  ),

  // ── Boost Rules: DELETE ───────────────────────────────────────────────
  ...[
    `${BASE}/admin/search/boost-rules/:id`,
    `${BASE}/catalog/admin/search/boost-rules/:id`,
  ].map((path) =>
    http.delete(path, async ({ params }) => {
      await delay(300);
      const idx = boostRules.findIndex((r) => r.id === params.id);
      if (idx === -1) return errorResponse(404, 'RULE_NOT_FOUND', 'Boost rule not found');
      boostRules.splice(idx, 1);
      return wrap({ deleted: true });
    }),
  ),

  // ── Search Analytics ──────────────────────────────────────────────────
  ...[
    `${BASE}/admin/search/analytics`,
    `${BASE}/catalog/admin/search/analytics`,
  ].map((path) =>
    http.get(path, async () => {
      await delay(400);
      return wrap(searchAnalytics);
    }),
  ),

  // ── Index Health ──────────────────────────────────────────────────────
  ...[
    `${BASE}/admin/search/index-health`,
    `${BASE}/catalog/admin/search/index-health`,
  ].map((path) =>
    http.get(path, async () => {
      await delay(300);
      return wrap(indexHealth);
    }),
  ),

  // ── Trigger Re-index ──────────────────────────────────────────────────
  ...[
    `${BASE}/admin/search/reindex/:indexName`,
    `${BASE}/catalog/admin/search/reindex/:indexName`,
  ].map((path) =>
    http.post(path, async ({ params }) => {
      await delay(800);
      const idx = indexHealth.findIndex((i) => i.index_name === params.indexName);
      if (idx === -1) return errorResponse(404, 'INDEX_NOT_FOUND', 'Index not found');
      indexHealth[idx] = {
        ...indexHealth[idx],
        status: 'green',
        sync_lag_seconds: 0,
        pending_docs: 0,
        last_synced: new Date().toISOString(),
      };
      return wrap({ message: `Re-indexing ${params.indexName} started`, index: indexHealth[idx] });
    }),
  ),
];
