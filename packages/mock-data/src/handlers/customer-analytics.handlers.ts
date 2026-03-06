import { http, delay } from 'msw';
import { wrap } from '../helpers';
import {
  customerOverview,
  demographics,
  acquisitionChannels,
  retentionCohorts,
  customerSegments,
  customerGrowth,
} from '../data/customer-analytics';

const BASE = '/api/v1';

export const customerAnalyticsHandlers = [
  // ── Customer Overview KPIs ────────────────────────────────────────────
  ...[
    `${BASE}/admin/analytics/customers/overview`,
    `${BASE}/users/admin/analytics/overview`,
  ].map((path) =>
    http.get(path, async () => {
      await delay(300);
      return wrap(customerOverview);
    }),
  ),

  // ── Demographics ──────────────────────────────────────────────────────
  ...[
    `${BASE}/admin/analytics/customers/demographics`,
    `${BASE}/users/admin/analytics/demographics`,
  ].map((path) =>
    http.get(path, async () => {
      await delay(400);
      return wrap(demographics);
    }),
  ),

  // ── Acquisition Channels ──────────────────────────────────────────────
  ...[
    `${BASE}/admin/analytics/customers/acquisition`,
    `${BASE}/users/admin/analytics/acquisition`,
  ].map((path) =>
    http.get(path, async () => {
      await delay(300);
      return wrap(acquisitionChannels);
    }),
  ),

  // ── Retention Cohorts ─────────────────────────────────────────────────
  ...[
    `${BASE}/admin/analytics/customers/retention`,
    `${BASE}/users/admin/analytics/retention`,
  ].map((path) =>
    http.get(path, async () => {
      await delay(400);
      return wrap(retentionCohorts);
    }),
  ),

  // ── Customer Segments ─────────────────────────────────────────────────
  ...[
    `${BASE}/admin/analytics/customers/segments`,
    `${BASE}/users/admin/analytics/segments`,
  ].map((path) =>
    http.get(path, async () => {
      await delay(300);
      return wrap(customerSegments);
    }),
  ),

  // ── Customer Growth (time-series) ─────────────────────────────────────
  ...[
    `${BASE}/admin/analytics/customers/growth`,
    `${BASE}/users/admin/analytics/growth`,
  ].map((path) =>
    http.get(path, async () => {
      await delay(300);
      return wrap(customerGrowth);
    }),
  ),
];
