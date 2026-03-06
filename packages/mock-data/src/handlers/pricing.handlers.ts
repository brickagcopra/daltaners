import { http, HttpResponse, delay } from 'msw';
import {
  pricingRules,
  priceHistory,
  computePricingStats,
  MockPricingRule,
} from '../data/pricing';
import { wrap, paginatedWrap, errorResponse, getSearchParams } from '../helpers';

const BASE = '/api/v1';
let localRules = [...pricingRules];
let localHistory = [...priceHistory];
let nextRuleId = localRules.length + 1;

// Mock store_id for the current vendor (matched with bearer token)
const CURRENT_VENDOR_STORE = 'store-001-uuid';

// ────────────────────────────────────────────────────
// Vendor endpoints: /api/v1/catalog/pricing-rules/*
// ────────────────────────────────────────────────────

async function handleListVendorRules(request: Request) {
  await delay(200);
  const sp = getSearchParams(request);
  const page = Number(sp.get('page') || '1');
  const limit = Number(sp.get('limit') || '20');
  const search = sp.get('search')?.toLowerCase();
  const ruleType = sp.get('rule_type');
  const status = sp.get('status');

  let filtered = localRules.filter((r) => r.store_id === CURRENT_VENDOR_STORE);
  if (search) {
    filtered = filtered.filter(
      (r) => r.name.toLowerCase().includes(search) || r.description?.toLowerCase().includes(search),
    );
  }
  if (ruleType && ruleType !== 'all') {
    filtered = filtered.filter((r) => r.rule_type === ruleType);
  }
  if (status && status !== 'all') {
    filtered = filtered.filter((r) => r.status === status);
  }

  filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return paginatedWrap(filtered, page, limit);
}

async function handleGetVendorRule(id: string) {
  await delay(100);
  const rule = localRules.find((r) => r.id === id);
  if (!rule) return errorResponse(404, 'RULE_NOT_FOUND', 'Pricing rule not found');
  if (rule.store_id !== CURRENT_VENDOR_STORE) {
    return errorResponse(403, 'FORBIDDEN', 'Cannot access a pricing rule from another store');
  }
  return wrap(rule);
}

async function handleCreateRule(request: Request) {
  await delay(300);
  const body = (await request.json()) as Record<string, unknown>;

  const startDate = new Date(body.start_date as string);
  const now = new Date();
  const autoStatus = startDate <= now ? 'active' : 'scheduled';

  const newRule: MockPricingRule = {
    id: `rule-${String(nextRuleId++).padStart(3, '0')}`,
    store_id: CURRENT_VENDOR_STORE,
    name: body.name as string,
    description: (body.description as string) || null,
    rule_type: body.rule_type as MockPricingRule['rule_type'],
    discount_type: body.discount_type as MockPricingRule['discount_type'],
    discount_value: body.discount_value as number,
    applies_to: body.applies_to as MockPricingRule['applies_to'],
    applies_to_ids: (body.applies_to_ids as string[]) || null,
    schedule: (body.schedule as MockPricingRule['schedule']) || null,
    conditions: (body.conditions as MockPricingRule['conditions']) || {},
    start_date: body.start_date as string,
    end_date: (body.end_date as string) || null,
    priority: (body.priority as number) || 0,
    is_active: autoStatus === 'active',
    max_uses: (body.max_uses as number) || null,
    current_uses: 0,
    status: autoStatus,
    created_by: 'user-vendor-001',
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };

  localRules.unshift(newRule);
  return HttpResponse.json(
    { success: true, data: newRule, timestamp: new Date().toISOString() },
    { status: 201 },
  );
}

async function handleUpdateRule(request: Request, id: string) {
  await delay(200);
  const idx = localRules.findIndex((r) => r.id === id);
  if (idx === -1) return errorResponse(404, 'RULE_NOT_FOUND', 'Pricing rule not found');
  if (localRules[idx].store_id !== CURRENT_VENDOR_STORE) {
    return errorResponse(403, 'FORBIDDEN', 'Cannot update a pricing rule from another store');
  }
  if (['expired', 'cancelled'].includes(localRules[idx].status)) {
    return errorResponse(400, 'INVALID_STATUS', `Cannot update a rule in "${localRules[idx].status}" status`);
  }

  const body = (await request.json()) as Record<string, unknown>;
  const updated: MockPricingRule = {
    ...localRules[idx],
    ...(body as Partial<MockPricingRule>),
    updated_at: new Date().toISOString(),
  };
  localRules[idx] = updated;
  return wrap(updated);
}

async function handleDeleteRule(id: string) {
  await delay(150);
  const idx = localRules.findIndex((r) => r.id === id);
  if (idx === -1) return errorResponse(404, 'RULE_NOT_FOUND', 'Pricing rule not found');
  if (localRules[idx].store_id !== CURRENT_VENDOR_STORE) {
    return errorResponse(403, 'FORBIDDEN', 'Cannot delete a pricing rule from another store');
  }
  if (localRules[idx].status === 'active') {
    return errorResponse(400, 'CANNOT_DELETE_ACTIVE', 'Cannot delete an active rule. Pause or cancel it first.');
  }

  localRules.splice(idx, 1);
  return new HttpResponse(null, { status: 204 });
}

async function handleRuleAction(id: string, action: string) {
  await delay(200);
  const idx = localRules.findIndex((r) => r.id === id);
  if (idx === -1) return errorResponse(404, 'RULE_NOT_FOUND', 'Pricing rule not found');
  if (localRules[idx].store_id !== CURRENT_VENDOR_STORE) {
    return errorResponse(403, 'FORBIDDEN', 'Cannot modify a pricing rule from another store');
  }

  const rule = localRules[idx];
  let newStatus = rule.status;

  switch (action) {
    case 'activate':
      if (!['draft', 'scheduled', 'paused'].includes(rule.status)) {
        return errorResponse(400, 'INVALID_STATUS', `Cannot activate a rule in "${rule.status}" status`);
      }
      newStatus = 'active';
      break;
    case 'pause':
      if (rule.status !== 'active') {
        return errorResponse(400, 'INVALID_STATUS', 'Only active rules can be paused');
      }
      newStatus = 'paused';
      break;
    case 'cancel':
      if (['expired', 'cancelled'].includes(rule.status)) {
        return errorResponse(400, 'INVALID_STATUS', `Rule is already in "${rule.status}" status`);
      }
      newStatus = 'cancelled';
      break;
    default:
      return errorResponse(400, 'INVALID_ACTION', `Unknown action: ${action}`);
  }

  localRules[idx] = {
    ...rule,
    status: newStatus as MockPricingRule['status'],
    is_active: newStatus === 'active',
    updated_at: new Date().toISOString(),
  };

  return wrap(localRules[idx]);
}

async function handleApplyRule(id: string) {
  await delay(400);
  const rule = localRules.find((r) => r.id === id);
  if (!rule) return errorResponse(404, 'RULE_NOT_FOUND', 'Pricing rule not found');
  if (rule.status !== 'active') {
    return errorResponse(400, 'NOT_ACTIVE', 'Can only apply active rules');
  }
  // Simulate applying to products
  const productsAffected = Math.floor(Math.random() * 10) + 3;
  return wrap({ rule_id: id, products_affected: productsAffected });
}

async function handleRevertRule(id: string) {
  await delay(300);
  const rule = localRules.find((r) => r.id === id);
  if (!rule) return errorResponse(404, 'RULE_NOT_FOUND', 'Pricing rule not found');
  const productsReverted = Math.floor(Math.random() * 8) + 1;
  return wrap({ rule_id: id, products_affected: productsReverted });
}

async function handleGetVendorStats() {
  await delay(150);
  const storeRules = localRules.filter((r) => r.store_id === CURRENT_VENDOR_STORE);
  return wrap(computePricingStats(storeRules));
}

// ────────────────────────────────────────────────────
// Product Pricing endpoints: /api/v1/catalog/pricing/*
// ────────────────────────────────────────────────────

async function handleGetEffectivePrice(request: Request) {
  await delay(100);
  const sp = getSearchParams(request);
  const productId = sp.get('product_id');
  if (!productId) return errorResponse(400, 'MISSING_PARAM', 'product_id is required');

  // Simulate an effective price response
  const basePrice = 150;
  const activeRule = localRules.find((r) => r.status === 'active' && r.store_id === CURRENT_VENDOR_STORE);
  if (activeRule) {
    let effectivePrice = basePrice;
    if (activeRule.discount_type === 'percentage') {
      effectivePrice = Math.round(basePrice * (1 - activeRule.discount_value / 100) * 100) / 100;
    } else if (activeRule.discount_type === 'fixed_amount') {
      effectivePrice = basePrice - activeRule.discount_value;
    } else {
      effectivePrice = activeRule.discount_value;
    }
    return wrap({
      product_id: productId,
      base_price: basePrice,
      effective_price: Math.max(0, effectivePrice),
      discount_amount: Math.max(0, basePrice - effectivePrice),
      applied_rule: {
        id: activeRule.id,
        name: activeRule.name,
        rule_type: activeRule.rule_type,
        discount_type: activeRule.discount_type,
        discount_value: activeRule.discount_value,
      },
    });
  }

  return wrap({
    product_id: productId,
    base_price: basePrice,
    effective_price: basePrice,
    discount_amount: 0,
    applied_rule: null,
  });
}

async function handleGetProductHistory(request: Request, productId: string) {
  await delay(150);
  const sp = getSearchParams(request);
  const page = Number(sp.get('page') || '1');
  const limit = Number(sp.get('limit') || '20');

  const filtered = localHistory.filter((h) => h.product_id === productId);
  filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return paginatedWrap(filtered, page, limit);
}

async function handleGetStoreHistory(request: Request) {
  await delay(200);
  const sp = getSearchParams(request);
  const page = Number(sp.get('page') || '1');
  const limit = Number(sp.get('limit') || '20');
  const changeType = sp.get('change_type');

  let filtered = localHistory.filter((h) => h.store_id === CURRENT_VENDOR_STORE);
  if (changeType && changeType !== 'all') {
    filtered = filtered.filter((h) => h.change_type === changeType);
  }
  filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return paginatedWrap(filtered, page, limit);
}

// ────────────────────────────────────────────────────
// Admin endpoints: /api/v1/admin/pricing/*
// ────────────────────────────────────────────────────

async function handleAdminListRules(request: Request) {
  await delay(200);
  const sp = getSearchParams(request);
  const page = Number(sp.get('page') || '1');
  const limit = Number(sp.get('limit') || '20');
  const search = sp.get('search')?.toLowerCase();
  const ruleType = sp.get('rule_type');
  const status = sp.get('status');
  const storeId = sp.get('store_id');

  let filtered = [...localRules];
  if (search) {
    filtered = filtered.filter(
      (r) => r.name.toLowerCase().includes(search) || r.description?.toLowerCase().includes(search),
    );
  }
  if (ruleType && ruleType !== 'all') {
    filtered = filtered.filter((r) => r.rule_type === ruleType);
  }
  if (status && status !== 'all') {
    filtered = filtered.filter((r) => r.status === status);
  }
  if (storeId) {
    filtered = filtered.filter((r) => r.store_id === storeId);
  }

  filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return paginatedWrap(filtered, page, limit);
}

async function handleAdminGetStats() {
  await delay(150);
  return wrap(computePricingStats(localRules));
}

async function handleAdminGetRule(id: string) {
  await delay(100);
  const rule = localRules.find((r) => r.id === id);
  if (!rule) return errorResponse(404, 'RULE_NOT_FOUND', 'Pricing rule not found');
  return wrap(rule);
}

async function handleAdminForceExpire(id: string) {
  await delay(200);
  const idx = localRules.findIndex((r) => r.id === id);
  if (idx === -1) return errorResponse(404, 'RULE_NOT_FOUND', 'Pricing rule not found');

  localRules[idx] = {
    ...localRules[idx],
    status: 'expired',
    is_active: false,
    end_date: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  return wrap(localRules[idx]);
}

async function handleAdminForceCancel(id: string) {
  await delay(200);
  const idx = localRules.findIndex((r) => r.id === id);
  if (idx === -1) return errorResponse(404, 'RULE_NOT_FOUND', 'Pricing rule not found');

  localRules[idx] = {
    ...localRules[idx],
    status: 'cancelled',
    is_active: false,
    updated_at: new Date().toISOString(),
  };
  return wrap(localRules[idx]);
}

async function handleAdminGetHistory(request: Request) {
  await delay(200);
  const sp = getSearchParams(request);
  const page = Number(sp.get('page') || '1');
  const limit = Number(sp.get('limit') || '20');
  const changeType = sp.get('change_type');
  const storeId = sp.get('store_id');

  let filtered = [...localHistory];
  if (changeType && changeType !== 'all') {
    filtered = filtered.filter((h) => h.change_type === changeType);
  }
  if (storeId) {
    filtered = filtered.filter((h) => h.store_id === storeId);
  }
  filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return paginatedWrap(filtered, page, limit);
}

// ────────────────────────────────────────────────────
// Handler registration
// ────────────────────────────────────────────────────

export const pricingHandlers = [
  // Vendor: Pricing Rules CRUD
  http.get(`${BASE}/catalog/pricing-rules`, ({ request }) => handleListVendorRules(request)),
  http.get(`${BASE}/catalog/pricing-rules/stats`, () => handleGetVendorStats()),
  http.get(`${BASE}/catalog/pricing-rules/:id`, ({ params }) => handleGetVendorRule(params.id as string)),
  http.post(`${BASE}/catalog/pricing-rules`, ({ request }) => handleCreateRule(request)),
  http.patch(`${BASE}/catalog/pricing-rules/:id`, ({ request, params }) => handleUpdateRule(request, params.id as string)),
  http.delete(`${BASE}/catalog/pricing-rules/:id`, ({ params }) => handleDeleteRule(params.id as string)),

  // Vendor: Rule actions
  http.patch(`${BASE}/catalog/pricing-rules/:id/activate`, ({ params }) => handleRuleAction(params.id as string, 'activate')),
  http.patch(`${BASE}/catalog/pricing-rules/:id/pause`, ({ params }) => handleRuleAction(params.id as string, 'pause')),
  http.patch(`${BASE}/catalog/pricing-rules/:id/cancel`, ({ params }) => handleRuleAction(params.id as string, 'cancel')),
  http.post(`${BASE}/catalog/pricing-rules/:id/apply`, ({ params }) => handleApplyRule(params.id as string)),
  http.post(`${BASE}/catalog/pricing-rules/:id/revert`, ({ params }) => handleRevertRule(params.id as string)),

  // Product pricing
  http.get(`${BASE}/catalog/pricing/effective-price`, ({ request }) => handleGetEffectivePrice(request)),
  http.get(`${BASE}/catalog/pricing/products/:productId/history`, ({ request, params }) => handleGetProductHistory(request, params.productId as string)),
  http.get(`${BASE}/catalog/pricing/store/history`, ({ request }) => handleGetStoreHistory(request)),

  // Admin: Pricing oversight
  http.get(`${BASE}/admin/pricing/rules`, ({ request }) => handleAdminListRules(request)),
  http.get(`${BASE}/admin/pricing/stats`, () => handleAdminGetStats()),
  http.get(`${BASE}/admin/pricing/rules/:id`, ({ params }) => handleAdminGetRule(params.id as string)),
  http.patch(`${BASE}/admin/pricing/rules/:id/force-expire`, ({ params }) => handleAdminForceExpire(params.id as string)),
  http.patch(`${BASE}/admin/pricing/rules/:id/force-cancel`, ({ params }) => handleAdminForceCancel(params.id as string)),
  http.get(`${BASE}/admin/pricing/history`, ({ request }) => handleAdminGetHistory(request)),

  // Duplicate paths for backend routing convention
  http.get(`${BASE}/pricing-rules`, ({ request }) => handleListVendorRules(request)),
  http.get(`${BASE}/pricing-rules/stats`, () => handleGetVendorStats()),
  http.get(`${BASE}/pricing-rules/:id`, ({ params }) => handleGetVendorRule(params.id as string)),
  http.post(`${BASE}/pricing-rules`, ({ request }) => handleCreateRule(request)),
  http.patch(`${BASE}/pricing-rules/:id`, ({ request, params }) => handleUpdateRule(request, params.id as string)),
  http.delete(`${BASE}/pricing-rules/:id`, ({ params }) => handleDeleteRule(params.id as string)),
  http.patch(`${BASE}/pricing-rules/:id/activate`, ({ params }) => handleRuleAction(params.id as string, 'activate')),
  http.patch(`${BASE}/pricing-rules/:id/pause`, ({ params }) => handleRuleAction(params.id as string, 'pause')),
  http.patch(`${BASE}/pricing-rules/:id/cancel`, ({ params }) => handleRuleAction(params.id as string, 'cancel')),
  http.post(`${BASE}/pricing-rules/:id/apply`, ({ params }) => handleApplyRule(params.id as string)),
  http.post(`${BASE}/pricing-rules/:id/revert`, ({ params }) => handleRevertRule(params.id as string)),
];
