import { http, HttpResponse, delay } from 'msw';
import {
  campaigns,
  campaignProducts,
  computeCampaignStats,
  computePlatformAdStats,
  generateCampaignPerformance,
  MockCampaign,
  MockCampaignProduct,
} from '../data/advertising';
import { products } from '../data';
import { stores } from '../data';
import { wrap, paginatedWrap, errorResponse, getSearchParams } from '../helpers';

const BASE = '/api/v1';
let localCampaigns = [...campaigns];
let localProducts = [...campaignProducts];
let nextCampId = localCampaigns.length + 1;
let nextProdId = localProducts.length + 1;

const CURRENT_VENDOR_STORE = 'store-001';

// ────────────────────────────────────────────────────
// Vendor endpoints: /api/v1/advertising/campaigns/*
// ────────────────────────────────────────────────────

async function handleListVendorCampaigns(request: Request) {
  await delay(200);
  const sp = getSearchParams(request);
  const page = Number(sp.get('page') || '1');
  const limit = Number(sp.get('limit') || '20');
  const search = sp.get('search')?.toLowerCase();
  const status = sp.get('status');
  const campaignType = sp.get('campaign_type');
  const placement = sp.get('placement');

  let filtered = localCampaigns.filter((c) => c.store_id === CURRENT_VENDOR_STORE);
  if (search) {
    filtered = filtered.filter(
      (c) => c.name.toLowerCase().includes(search) || c.description?.toLowerCase().includes(search),
    );
  }
  if (status && status !== 'all') filtered = filtered.filter((c) => c.status === status);
  if (campaignType && campaignType !== 'all') filtered = filtered.filter((c) => c.campaign_type === campaignType);
  if (placement && placement !== 'all') filtered = filtered.filter((c) => c.placement === placement);

  filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return paginatedWrap(filtered, page, limit);
}

async function handleGetVendorCampaign(id: string) {
  await delay(100);
  const camp = localCampaigns.find((c) => c.id === id);
  if (!camp) return errorResponse(404, 'CAMPAIGN_NOT_FOUND', 'Campaign not found');
  if (camp.store_id !== CURRENT_VENDOR_STORE) return errorResponse(403, 'FORBIDDEN', 'Cannot access campaign from another store');
  return wrap(camp);
}

async function handleVendorStats() {
  await delay(100);
  const storeCampaigns = localCampaigns.filter((c) => c.store_id === CURRENT_VENDOR_STORE);
  return wrap(computeCampaignStats(storeCampaigns));
}

async function handleCreateCampaign(request: Request) {
  await delay(300);
  const body = (await request.json()) as Record<string, unknown>;

  const newCamp: MockCampaign = {
    id: `camp-${String(nextCampId++).padStart(3, '0')}`,
    store_id: CURRENT_VENDOR_STORE,
    name: body.name as string,
    description: (body.description as string) || null,
    campaign_type: body.campaign_type as MockCampaign['campaign_type'],
    status: 'draft',
    budget_type: (body.budget_type as MockCampaign['budget_type']) || 'total',
    budget_amount: body.budget_amount as number,
    spent_amount: 0,
    daily_budget: (body.daily_budget as number) || null,
    daily_spent: 0,
    daily_spent_date: null,
    bid_type: (body.bid_type as MockCampaign['bid_type']) || 'cpc',
    bid_amount: body.bid_amount as number,
    targeting: (body.targeting as MockCampaign['targeting']) || {},
    placement: (body.placement as MockCampaign['placement']) || 'search_results',
    banner_image_url: (body.banner_image_url as string) || null,
    banner_link_url: (body.banner_link_url as string) || null,
    start_date: body.start_date as string,
    end_date: (body.end_date as string) || null,
    total_impressions: 0,
    total_clicks: 0,
    total_conversions: 0,
    conversion_revenue: 0,
    rejection_reason: null,
    suspension_reason: null,
    approved_by: null,
    approved_at: null,
    created_by: 'user-vendor-001',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    store_name: "Aling Nena's Sari-Sari",
  };

  // Add optional products
  const productIds = body.product_ids as string[] | undefined;
  if (productIds?.length) {
    for (const pid of productIds) {
      localProducts.push({
        id: `cp-${String(nextProdId++).padStart(3, '0')}`,
        campaign_id: newCamp.id,
        product_id: pid,
        bid_amount: null,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        spent: 0,
        is_active: true,
        created_at: new Date().toISOString(),
        product_name: `Product ${pid}`,
      });
    }
  }

  localCampaigns.push(newCamp);
  return HttpResponse.json({ success: true, data: newCamp, timestamp: new Date().toISOString() }, { status: 201 });
}

async function handleUpdateCampaign(request: Request, id: string) {
  await delay(200);
  const camp = localCampaigns.find((c) => c.id === id);
  if (!camp) return errorResponse(404, 'CAMPAIGN_NOT_FOUND', 'Campaign not found');
  if (camp.store_id !== CURRENT_VENDOR_STORE) return errorResponse(403, 'FORBIDDEN', 'Cannot update another store\'s campaign');
  if (!['draft', 'paused', 'rejected'].includes(camp.status)) {
    return errorResponse(400, 'INVALID_STATUS', `Cannot update campaign in ${camp.status} status`);
  }
  const body = (await request.json()) as Record<string, unknown>;
  Object.assign(camp, body, { updated_at: new Date().toISOString() });
  if (camp.status === 'rejected') camp.status = 'draft';
  return wrap(camp);
}

async function handleDeleteCampaign(id: string) {
  await delay(200);
  const idx = localCampaigns.findIndex((c) => c.id === id);
  if (idx === -1) return errorResponse(404, 'CAMPAIGN_NOT_FOUND', 'Campaign not found');
  const camp = localCampaigns[idx];
  if (camp.store_id !== CURRENT_VENDOR_STORE) return errorResponse(403, 'FORBIDDEN', 'Cannot delete another store\'s campaign');
  if (!['draft', 'rejected', 'cancelled'].includes(camp.status)) {
    return errorResponse(400, 'INVALID_STATUS', `Cannot delete campaign in ${camp.status} status`);
  }
  localCampaigns.splice(idx, 1);
  localProducts = localProducts.filter((p) => p.campaign_id !== id);
  return new HttpResponse(null, { status: 204 });
}

async function handleCampaignAction(id: string, action: string) {
  await delay(200);
  const camp = localCampaigns.find((c) => c.id === id);
  if (!camp) return errorResponse(404, 'CAMPAIGN_NOT_FOUND', 'Campaign not found');
  if (camp.store_id !== CURRENT_VENDOR_STORE) return errorResponse(403, 'FORBIDDEN', 'Cannot modify another store\'s campaign');

  const now = new Date().toISOString();
  switch (action) {
    case 'submit':
      if (camp.status !== 'draft') return errorResponse(400, 'INVALID_STATUS', 'Only draft campaigns can be submitted');
      if (camp.budget_amount <= 0) return errorResponse(400, 'INVALID_BUDGET', 'Budget must be greater than 0');
      camp.status = 'pending_review';
      break;
    case 'pause':
      if (camp.status !== 'active') return errorResponse(400, 'INVALID_STATUS', 'Only active campaigns can be paused');
      camp.status = 'paused';
      break;
    case 'resume':
      if (camp.status !== 'paused') return errorResponse(400, 'INVALID_STATUS', 'Only paused campaigns can be resumed');
      camp.status = 'active';
      break;
    case 'cancel':
      if (!['draft', 'pending_review', 'approved', 'active', 'paused'].includes(camp.status)) {
        return errorResponse(400, 'INVALID_STATUS', `Cannot cancel campaign in ${camp.status} status`);
      }
      camp.status = 'cancelled';
      break;
    default:
      return errorResponse(400, 'INVALID_ACTION', `Unknown action: ${action}`);
  }
  camp.updated_at = now;
  return wrap(camp);
}

async function handleGetPerformance(id: string, request: Request) {
  await delay(200);
  const camp = localCampaigns.find((c) => c.id === id);
  if (!camp) return errorResponse(404, 'CAMPAIGN_NOT_FOUND', 'Campaign not found');
  const sp = getSearchParams(request);
  const days = Number(sp.get('days') || '30');
  return wrap(generateCampaignPerformance(camp, days));
}

async function handleListProducts(id: string) {
  await delay(100);
  const products = localProducts.filter((p) => p.campaign_id === id);
  return wrap(products);
}

async function handleAddProduct(request: Request, id: string) {
  await delay(200);
  const camp = localCampaigns.find((c) => c.id === id);
  if (!camp) return errorResponse(404, 'CAMPAIGN_NOT_FOUND', 'Campaign not found');
  const body = (await request.json()) as Record<string, unknown>;
  const existing = localProducts.find((p) => p.campaign_id === id && p.product_id === body.product_id);
  if (existing) return errorResponse(409, 'DUPLICATE', 'Product already in campaign');

  const newProd: MockCampaignProduct = {
    id: `cp-${String(nextProdId++).padStart(3, '0')}`,
    campaign_id: id,
    product_id: body.product_id as string,
    bid_amount: (body.bid_amount as number) || null,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    spent: 0,
    is_active: true,
    created_at: new Date().toISOString(),
    product_name: `Product ${body.product_id}`,
  };
  localProducts.push(newProd);
  return HttpResponse.json({ success: true, data: newProd, timestamp: new Date().toISOString() }, { status: 201 });
}

async function handleRemoveProduct(campaignId: string, productId: string) {
  await delay(100);
  const idx = localProducts.findIndex((p) => p.campaign_id === campaignId && p.product_id === productId);
  if (idx === -1) return errorResponse(404, 'PRODUCT_NOT_FOUND', 'Product not found in campaign');
  localProducts.splice(idx, 1);
  return new HttpResponse(null, { status: 204 });
}

// ────────────────────────────────────────────────────
// Admin endpoints: /api/v1/admin/advertising/*
// ────────────────────────────────────────────────────

async function handleAdminListCampaigns(request: Request) {
  await delay(200);
  const sp = getSearchParams(request);
  const page = Number(sp.get('page') || '1');
  const limit = Number(sp.get('limit') || '20');
  const search = sp.get('search')?.toLowerCase();
  const status = sp.get('status');
  const campaignType = sp.get('campaign_type');
  const placement = sp.get('placement');
  const storeId = sp.get('store_id');
  const sortBy = sp.get('sort_by') || 'created_at';
  const sortOrder = sp.get('sort_order') || 'DESC';

  let filtered = [...localCampaigns];
  if (search) {
    filtered = filtered.filter(
      (c) => c.name.toLowerCase().includes(search) || c.store_name?.toLowerCase().includes(search),
    );
  }
  if (status && status !== 'all') filtered = filtered.filter((c) => c.status === status);
  if (campaignType && campaignType !== 'all') filtered = filtered.filter((c) => c.campaign_type === campaignType);
  if (placement && placement !== 'all') filtered = filtered.filter((c) => c.placement === placement);
  if (storeId) filtered = filtered.filter((c) => c.store_id === storeId);

  filtered.sort((a, b) => {
    const aVal = (a as unknown as Record<string, unknown>)[sortBy];
    const bVal = (b as unknown as Record<string, unknown>)[sortBy];
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortOrder === 'ASC' ? aVal - bVal : bVal - aVal;
    }
    const aStr = String(aVal || '');
    const bStr = String(bVal || '');
    return sortOrder === 'ASC' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
  });
  return paginatedWrap(filtered, page, limit);
}

async function handleAdminCampaignStats() {
  await delay(100);
  return wrap(computeCampaignStats(localCampaigns));
}

async function handleAdminPlatformStats() {
  await delay(150);
  return wrap(computePlatformAdStats(localCampaigns));
}

async function handleAdminGetCampaign(id: string) {
  await delay(100);
  const camp = localCampaigns.find((c) => c.id === id);
  if (!camp) return errorResponse(404, 'CAMPAIGN_NOT_FOUND', 'Campaign not found');
  return wrap(camp);
}

async function handleAdminGetPerformance(id: string, request: Request) {
  await delay(200);
  const camp = localCampaigns.find((c) => c.id === id);
  if (!camp) return errorResponse(404, 'CAMPAIGN_NOT_FOUND', 'Campaign not found');
  const sp = getSearchParams(request);
  const days = Number(sp.get('days') || '30');
  return wrap(generateCampaignPerformance(camp, days));
}

async function handleAdminApproveCampaign(id: string) {
  await delay(300);
  const camp = localCampaigns.find((c) => c.id === id);
  if (!camp) return errorResponse(404, 'CAMPAIGN_NOT_FOUND', 'Campaign not found');
  if (camp.status !== 'pending_review') return errorResponse(400, 'INVALID_STATUS', 'Only pending_review campaigns can be approved');
  const now = new Date();
  const startDate = new Date(camp.start_date);
  camp.status = startDate <= now ? 'active' : 'approved';
  camp.approved_by = 'user-admin-001';
  camp.approved_at = now.toISOString();
  camp.updated_at = now.toISOString();
  return wrap(camp);
}

async function handleAdminRejectCampaign(request: Request, id: string) {
  await delay(300);
  const camp = localCampaigns.find((c) => c.id === id);
  if (!camp) return errorResponse(404, 'CAMPAIGN_NOT_FOUND', 'Campaign not found');
  if (camp.status !== 'pending_review') return errorResponse(400, 'INVALID_STATUS', 'Only pending_review campaigns can be rejected');
  const body = (await request.json()) as Record<string, unknown>;
  camp.status = 'rejected';
  camp.rejection_reason = (body.reason as string) || 'Campaign does not meet advertising guidelines';
  camp.updated_at = new Date().toISOString();
  return wrap(camp);
}

async function handleAdminSuspendCampaign(request: Request, id: string) {
  await delay(300);
  const camp = localCampaigns.find((c) => c.id === id);
  if (!camp) return errorResponse(404, 'CAMPAIGN_NOT_FOUND', 'Campaign not found');
  if (camp.status !== 'active') return errorResponse(400, 'INVALID_STATUS', 'Only active campaigns can be suspended');
  const body = (await request.json()) as Record<string, unknown>;
  camp.status = 'suspended';
  camp.suspension_reason = (body.reason as string) || 'Campaign suspended for policy review';
  camp.updated_at = new Date().toISOString();
  return wrap(camp);
}

// ────────────────────────────────────────────────────
// Public endpoints: /api/v1/ads/*
// ────────────────────────────────────────────────────

async function handleSponsoredProducts(request: Request) {
  await delay(100);
  const sp = getSearchParams(request);
  const placement = sp.get('placement') || 'search_results';
  const limit = Number(sp.get('limit') || '5');

  const activeCampaigns = localCampaigns.filter(
    (c) => c.status === 'active' && c.placement === placement,
  );
  const campProds: MockCampaignProduct[] = [];
  for (const camp of activeCampaigns) {
    const prods = localProducts.filter((p) => p.campaign_id === camp.id && p.is_active);
    campProds.push(...prods);
  }

  // Enrich campaign products with actual product data for the frontend
  const enriched = campProds.slice(0, limit).map((cp) => {
    const product = products.find((p) => p.id === cp.product_id);
    const camp = localCampaigns.find((c) => c.id === cp.campaign_id);
    const store = product ? stores.find((s) => s.id === product.store_id) : null;
    return {
      campaign_id: cp.campaign_id,
      campaign_product_id: cp.id,
      product_id: cp.product_id,
      product_name: product?.name ?? cp.product_name,
      product_slug: product?.slug ?? cp.product_id,
      product_image_url: product?.images?.[0]?.url ?? null,
      base_price: product?.base_price ?? 0,
      sale_price: product?.sale_price ?? null,
      store_id: product?.store_id ?? '',
      store_name: store?.name ?? camp?.store_name ?? '',
      rating_average: product?.rating_average ?? 0,
      bid_amount: cp.bid_amount ?? camp?.bid_amount ?? 0,
      placement,
    };
  });

  return wrap(enriched);
}

async function handleBanners(request: Request) {
  await delay(100);
  const sp = getSearchParams(request);
  const placement = sp.get('placement') || 'home_page';
  const limit = Number(sp.get('limit') || '5');

  const banners = localCampaigns.filter(
    (c) => c.status === 'active' && c.placement === placement && c.banner_image_url,
  );
  return wrap(banners.slice(0, limit));
}

async function handleRecordImpression(_request: Request, campaignId: string) {
  await delay(50);
  const camp = localCampaigns.find((c) => c.id === campaignId);
  if (!camp) return errorResponse(404, 'CAMPAIGN_NOT_FOUND', 'Campaign not found');
  camp.total_impressions += 1;
  if (camp.bid_type === 'cpm') camp.spent_amount += camp.bid_amount / 1000;
  return HttpResponse.json({
    success: true,
    data: { id: `imp-${Date.now()}`, campaign_id: campaignId, created_at: new Date().toISOString() },
    timestamp: new Date().toISOString(),
  }, { status: 201 });
}

async function handleRecordClick(_request: Request, campaignId: string) {
  await delay(50);
  const camp = localCampaigns.find((c) => c.id === campaignId);
  if (!camp) return errorResponse(404, 'CAMPAIGN_NOT_FOUND', 'Campaign not found');
  camp.total_clicks += 1;
  if (camp.bid_type === 'cpc') camp.spent_amount += camp.bid_amount;
  return HttpResponse.json({
    success: true,
    data: { id: `click-${Date.now()}`, campaign_id: campaignId, created_at: new Date().toISOString() },
    timestamp: new Date().toISOString(),
  }, { status: 201 });
}

async function handleRecordConversion(request: Request) {
  await delay(50);
  const body = (await request.json()) as Record<string, unknown>;
  const camp = localCampaigns.find((c) => c.id === body.campaign_id);
  if (camp) {
    camp.total_conversions += 1;
    camp.conversion_revenue += (body.order_amount as number) || 0;
  }
  return wrap({ tracked: true });
}

// ────────────────────────────────────────────────────
// Export
// ────────────────────────────────────────────────────

export const advertisingHandlers = [
  // Vendor: Campaign CRUD
  http.get(`${BASE}/advertising/campaigns`, ({ request }) => handleListVendorCampaigns(request)),
  http.get(`${BASE}/advertising/campaigns/stats`, () => handleVendorStats()),
  http.get(`${BASE}/advertising/campaigns/:id`, ({ params }) => handleGetVendorCampaign(params.id as string)),
  http.post(`${BASE}/advertising/campaigns`, ({ request }) => handleCreateCampaign(request)),
  http.patch(`${BASE}/advertising/campaigns/:id`, ({ request, params }) => handleUpdateCampaign(request, params.id as string)),
  http.delete(`${BASE}/advertising/campaigns/:id`, ({ params }) => handleDeleteCampaign(params.id as string)),

  // Vendor: Campaign actions
  http.patch(`${BASE}/advertising/campaigns/:id/submit`, ({ params }) => handleCampaignAction(params.id as string, 'submit')),
  http.patch(`${BASE}/advertising/campaigns/:id/pause`, ({ params }) => handleCampaignAction(params.id as string, 'pause')),
  http.patch(`${BASE}/advertising/campaigns/:id/resume`, ({ params }) => handleCampaignAction(params.id as string, 'resume')),
  http.patch(`${BASE}/advertising/campaigns/:id/cancel`, ({ params }) => handleCampaignAction(params.id as string, 'cancel')),

  // Vendor: Performance + Products
  http.get(`${BASE}/advertising/campaigns/:id/performance`, ({ request, params }) => handleGetPerformance(params.id as string, request)),
  http.get(`${BASE}/advertising/campaigns/:id/products`, ({ params }) => handleListProducts(params.id as string)),
  http.post(`${BASE}/advertising/campaigns/:id/products`, ({ request, params }) => handleAddProduct(request, params.id as string)),
  http.delete(`${BASE}/advertising/campaigns/:id/products/:productId`, ({ params }) => handleRemoveProduct(params.id as string, params.productId as string)),

  // Admin: Campaign oversight
  http.get(`${BASE}/admin/advertising/campaigns`, ({ request }) => handleAdminListCampaigns(request)),
  http.get(`${BASE}/admin/advertising/campaigns/stats`, () => handleAdminCampaignStats()),
  http.get(`${BASE}/admin/advertising/stats`, () => handleAdminPlatformStats()),
  http.get(`${BASE}/admin/advertising/campaigns/:id`, ({ params }) => handleAdminGetCampaign(params.id as string)),
  http.get(`${BASE}/admin/advertising/campaigns/:id/performance`, ({ request, params }) => handleAdminGetPerformance(params.id as string, request)),
  http.patch(`${BASE}/admin/advertising/campaigns/:id/approve`, ({ params }) => handleAdminApproveCampaign(params.id as string)),
  http.patch(`${BASE}/admin/advertising/campaigns/:id/reject`, ({ request, params }) => handleAdminRejectCampaign(request, params.id as string)),
  http.patch(`${BASE}/admin/advertising/campaigns/:id/suspend`, ({ request, params }) => handleAdminSuspendCampaign(request, params.id as string)),

  // Public: Ads (both /ads/* and /advertising/* paths for frontend compatibility)
  http.get(`${BASE}/ads/sponsored-products`, ({ request }) => handleSponsoredProducts(request)),
  http.get(`${BASE}/ads/banners`, ({ request }) => handleBanners(request)),
  http.post(`${BASE}/ads/:campaignId/impressions`, ({ request, params }) => handleRecordImpression(request, params.campaignId as string)),
  http.post(`${BASE}/ads/:campaignId/clicks`, ({ request, params }) => handleRecordClick(request, params.campaignId as string)),
  http.post(`${BASE}/ads/conversions`, ({ request }) => handleRecordConversion(request)),

  // Aliases: customer-web uses /advertising/* for public endpoints
  http.get(`${BASE}/advertising/sponsored-products`, ({ request }) => handleSponsoredProducts(request)),
  http.get(`${BASE}/advertising/banners`, ({ request }) => handleBanners(request)),
  http.post(`${BASE}/advertising/impressions`, ({ request }) => handleRecordConversion(request)),
  http.post(`${BASE}/advertising/clicks`, ({ request }) => handleRecordConversion(request)),
];
