// Advertising / Campaign mock data

export type CampaignType = 'sponsored_listing' | 'banner_ad' | 'featured_store' | 'product_promotion';
export type CampaignStatus = 'draft' | 'pending_review' | 'approved' | 'active' | 'paused' | 'completed' | 'rejected' | 'cancelled' | 'suspended';
export type BudgetType = 'daily' | 'total';
export type BidType = 'cpc' | 'cpm' | 'flat';
export type AdPlacement = 'search_results' | 'home_page' | 'category_page' | 'store_page' | 'product_page';

export interface CampaignTargeting {
  categories?: string[];
  zones?: string[];
  customer_segments?: string[];
  keywords?: string[];
}

export interface MockCampaign {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  campaign_type: CampaignType;
  status: CampaignStatus;
  budget_type: BudgetType;
  budget_amount: number;
  spent_amount: number;
  daily_budget: number | null;
  daily_spent: number;
  daily_spent_date: string | null;
  bid_type: BidType;
  bid_amount: number;
  targeting: CampaignTargeting;
  placement: AdPlacement;
  banner_image_url: string | null;
  banner_link_url: string | null;
  start_date: string;
  end_date: string | null;
  total_impressions: number;
  total_clicks: number;
  total_conversions: number;
  conversion_revenue: number;
  rejection_reason: string | null;
  suspension_reason: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined display fields
  store_name?: string;
}

export interface MockCampaignProduct {
  id: string;
  campaign_id: string;
  product_id: string;
  bid_amount: number | null;
  impressions: number;
  clicks: number;
  conversions: number;
  spent: number;
  is_active: boolean;
  created_at: string;
  // Joined display fields
  product_name?: string;
  product_image_url?: string;
}

export interface MockCampaignPerformance {
  campaign_id: string;
  total_impressions: number;
  total_clicks: number;
  total_conversions: number;
  total_spent: number;
  conversion_revenue: number;
  ctr: number;
  conversion_rate: number;
  avg_cpc: number;
  roas: number;
  daily: { date: string; impressions: number; clicks: number; conversions: number; spent: number }[];
}

export interface MockCampaignStats {
  total: number;
  draft: number;
  pending_review: number;
  approved: number;
  active: number;
  paused: number;
  completed: number;
  rejected: number;
  cancelled: number;
  suspended: number;
}

export interface MockPlatformAdStats {
  total_spend: number;
  total_impressions: number;
  total_clicks: number;
  total_conversions: number;
  avg_cpc: number;
  total_campaigns: number;
  active_campaigns: number;
  by_status: MockCampaignStats;
}

// ── Constants ────────────────────────────────────────────
const STORE_IDS = ['store-001', 'store-002', 'store-003'];
const STORE_NAMES = ['Aling Nena\'s Sari-Sari', 'Fresh Greens BGC', 'Sugbo Eats'];
const USER_IDS = ['user-vendor-001', 'user-vendor-002', 'user-vendor-003'];
const ADMIN_IDS = ['user-admin-001', 'user-admin-002'];
const PRODUCT_IDS = [
  'prod-029', 'prod-030', 'prod-031',
  'prod-032', 'prod-033', 'prod-034',
  'prod-035', 'prod-036',
];
const PRODUCT_NAMES = [
  'Lucky Me Pancit Canton Original', 'Ligo Sardines in Tomato Sauce 155g',
  'Lucky Me Instant Mami Chicken', 'Datu Puti Soy Sauce 1L',
  'Century Tuna Flakes in Oil 180g', 'Datu Puti Vinegar 1L',
  'Argentina Corned Beef 260g', 'Mega Sardines in Tomato Sauce',
];

// ── Campaigns ────────────────────────────────────────────

export const campaigns: MockCampaign[] = [
  {
    id: 'camp-001',
    store_id: STORE_IDS[0],
    name: 'Snacks Spotlight — Search Boost',
    description: 'Promote snack products in search results to increase visibility during afternoon hours',
    campaign_type: 'sponsored_listing',
    status: 'active',
    budget_type: 'total',
    budget_amount: 5000,
    spent_amount: 1842.50,
    daily_budget: 250,
    daily_spent: 87.30,
    daily_spent_date: '2026-03-03',
    bid_type: 'cpc',
    bid_amount: 2.50,
    targeting: { categories: ['cat-snacks-002'], keywords: ['chips', 'piattos', 'snack'] },
    placement: 'search_results',
    banner_image_url: null,
    banner_link_url: null,
    start_date: '2026-02-15T00:00:00.000Z',
    end_date: '2026-04-15T23:59:59.000Z',
    total_impressions: 24500,
    total_clicks: 737,
    total_conversions: 89,
    conversion_revenue: 12450,
    rejection_reason: null,
    suspension_reason: null,
    approved_by: ADMIN_IDS[0],
    approved_at: '2026-02-14T16:00:00.000Z',
    created_by: USER_IDS[0],
    created_at: '2026-02-13T10:00:00.000Z',
    updated_at: '2026-03-03T08:00:00.000Z',
    store_name: STORE_NAMES[0],
  },
  {
    id: 'camp-002',
    store_id: STORE_IDS[0],
    name: 'March Mega Banner',
    description: 'Home page banner campaign for March promotions — eye-catching banner with store highlights',
    campaign_type: 'banner_ad',
    status: 'active',
    budget_type: 'total',
    budget_amount: 10000,
    spent_amount: 3200,
    daily_budget: 500,
    daily_spent: 145.80,
    daily_spent_date: '2026-03-03',
    bid_type: 'cpm',
    bid_amount: 15,
    targeting: { zones: ['zone-metro-manila', 'zone-cebu'] },
    placement: 'home_page',
    banner_image_url: 'https://cdn.daltaners.ph/banners/march-mega-sale.jpg',
    banner_link_url: '/store/aling-nenas-sari-sari',
    start_date: '2026-03-01T00:00:00.000Z',
    end_date: '2026-03-31T23:59:59.000Z',
    total_impressions: 213000,
    total_clicks: 4260,
    total_conversions: 156,
    conversion_revenue: 23400,
    rejection_reason: null,
    suspension_reason: null,
    approved_by: ADMIN_IDS[0],
    approved_at: '2026-02-28T14:00:00.000Z',
    created_by: USER_IDS[0],
    created_at: '2026-02-27T09:00:00.000Z',
    updated_at: '2026-03-03T07:30:00.000Z',
    store_name: STORE_NAMES[0],
  },
  {
    id: 'camp-003',
    store_id: STORE_IDS[1],
    name: 'Fresh Mart Featured Store',
    description: 'Feature our store on the home page to attract new customers',
    campaign_type: 'featured_store',
    status: 'active',
    budget_type: 'daily',
    budget_amount: 300,
    spent_amount: 4500,
    daily_budget: 300,
    daily_spent: 210.40,
    daily_spent_date: '2026-03-03',
    bid_type: 'flat',
    bid_amount: 300,
    targeting: { zones: ['zone-metro-manila'] },
    placement: 'home_page',
    banner_image_url: 'https://cdn.daltaners.ph/banners/fresh-mart-featured.jpg',
    banner_link_url: '/store/fresh-mart-supermarket',
    start_date: '2026-02-20T00:00:00.000Z',
    end_date: null,
    total_impressions: 89000,
    total_clicks: 2670,
    total_conversions: 234,
    conversion_revenue: 42120,
    rejection_reason: null,
    suspension_reason: null,
    approved_by: ADMIN_IDS[1],
    approved_at: '2026-02-19T11:00:00.000Z',
    created_by: USER_IDS[1],
    created_at: '2026-02-18T14:00:00.000Z',
    updated_at: '2026-03-03T06:00:00.000Z',
    store_name: STORE_NAMES[1],
  },
  {
    id: 'camp-004',
    store_id: STORE_IDS[1],
    name: 'Dairy Products Promo',
    description: 'Promote dairy products on category pages for increased sales',
    campaign_type: 'product_promotion',
    status: 'paused',
    budget_type: 'total',
    budget_amount: 3000,
    spent_amount: 1650,
    daily_budget: null,
    daily_spent: 0,
    daily_spent_date: null,
    bid_type: 'cpc',
    bid_amount: 3.00,
    targeting: { categories: ['cat-dairy-004'] },
    placement: 'category_page',
    banner_image_url: null,
    banner_link_url: null,
    start_date: '2026-02-01T00:00:00.000Z',
    end_date: '2026-03-31T23:59:59.000Z',
    total_impressions: 15200,
    total_clicks: 550,
    total_conversions: 45,
    conversion_revenue: 6750,
    rejection_reason: null,
    suspension_reason: null,
    approved_by: ADMIN_IDS[0],
    approved_at: '2026-01-31T10:00:00.000Z',
    created_by: USER_IDS[1],
    created_at: '2026-01-30T16:00:00.000Z',
    updated_at: '2026-02-25T09:00:00.000Z',
    store_name: STORE_NAMES[1],
  },
  {
    id: 'camp-005',
    store_id: STORE_IDS[2],
    name: 'Metro Grocery — Summer Launch',
    description: 'Summer launch campaign to promote new store across all placements',
    campaign_type: 'banner_ad',
    status: 'pending_review',
    budget_type: 'total',
    budget_amount: 15000,
    spent_amount: 0,
    daily_budget: 750,
    daily_spent: 0,
    daily_spent_date: null,
    bid_type: 'cpm',
    bid_amount: 12,
    targeting: { zones: ['zone-metro-manila', 'zone-cebu', 'zone-davao'], customer_segments: ['new_users'] },
    placement: 'home_page',
    banner_image_url: 'https://cdn.daltaners.ph/banners/metro-summer-launch.jpg',
    banner_link_url: '/store/metro-grocery-hub',
    start_date: '2026-04-01T00:00:00.000Z',
    end_date: '2026-04-30T23:59:59.000Z',
    total_impressions: 0,
    total_clicks: 0,
    total_conversions: 0,
    conversion_revenue: 0,
    rejection_reason: null,
    suspension_reason: null,
    approved_by: null,
    approved_at: null,
    created_by: USER_IDS[2],
    created_at: '2026-03-02T11:00:00.000Z',
    updated_at: '2026-03-02T11:00:00.000Z',
    store_name: STORE_NAMES[2],
  },
  {
    id: 'camp-006',
    store_id: STORE_IDS[0],
    name: 'Valentine\'s Day Specials',
    description: 'Valentine\'s Day special promotions — completed campaign',
    campaign_type: 'product_promotion',
    status: 'completed',
    budget_type: 'total',
    budget_amount: 2000,
    spent_amount: 1980,
    daily_budget: null,
    daily_spent: 0,
    daily_spent_date: null,
    bid_type: 'cpc',
    bid_amount: 2.00,
    targeting: { keywords: ['valentine', 'gift', 'chocolate'] },
    placement: 'search_results',
    banner_image_url: null,
    banner_link_url: null,
    start_date: '2026-02-10T00:00:00.000Z',
    end_date: '2026-02-15T23:59:59.000Z',
    total_impressions: 18700,
    total_clicks: 990,
    total_conversions: 112,
    conversion_revenue: 15680,
    rejection_reason: null,
    suspension_reason: null,
    approved_by: ADMIN_IDS[0],
    approved_at: '2026-02-09T15:00:00.000Z',
    created_by: USER_IDS[0],
    created_at: '2026-02-08T10:00:00.000Z',
    updated_at: '2026-02-16T00:05:00.000Z',
    store_name: STORE_NAMES[0],
  },
  {
    id: 'camp-007',
    store_id: STORE_IDS[2],
    name: 'Metro Grocery Search Ads',
    description: 'Rejected campaign — banner image violated content policy',
    campaign_type: 'banner_ad',
    status: 'rejected',
    budget_type: 'total',
    budget_amount: 8000,
    spent_amount: 0,
    daily_budget: 400,
    daily_spent: 0,
    daily_spent_date: null,
    bid_type: 'cpm',
    bid_amount: 10,
    targeting: { zones: ['zone-metro-manila'] },
    placement: 'home_page',
    banner_image_url: 'https://cdn.daltaners.ph/banners/metro-rejected.jpg',
    banner_link_url: '/store/metro-grocery-hub',
    start_date: '2026-03-01T00:00:00.000Z',
    end_date: '2026-03-31T23:59:59.000Z',
    total_impressions: 0,
    total_clicks: 0,
    total_conversions: 0,
    conversion_revenue: 0,
    rejection_reason: 'Banner image contains misleading price claims. Please update the creative to comply with our advertising guidelines.',
    suspension_reason: null,
    approved_by: null,
    approved_at: null,
    created_by: USER_IDS[2],
    created_at: '2026-02-26T09:00:00.000Z',
    updated_at: '2026-02-27T10:00:00.000Z',
    store_name: STORE_NAMES[2],
  },
  {
    id: 'camp-008',
    store_id: STORE_IDS[0],
    name: 'Rainy Season Essentials (Draft)',
    description: 'Upcoming campaign for rainy season — still being set up',
    campaign_type: 'sponsored_listing',
    status: 'draft',
    budget_type: 'total',
    budget_amount: 4000,
    spent_amount: 0,
    daily_budget: 200,
    daily_spent: 0,
    daily_spent_date: null,
    bid_type: 'cpc',
    bid_amount: 1.80,
    targeting: { categories: ['cat-grocery-001'], keywords: ['umbrella', 'raincoat', 'canned goods'] },
    placement: 'search_results',
    banner_image_url: null,
    banner_link_url: null,
    start_date: '2026-06-01T00:00:00.000Z',
    end_date: '2026-08-31T23:59:59.000Z',
    total_impressions: 0,
    total_clicks: 0,
    total_conversions: 0,
    conversion_revenue: 0,
    rejection_reason: null,
    suspension_reason: null,
    approved_by: null,
    approved_at: null,
    created_by: USER_IDS[0],
    created_at: '2026-03-02T15:00:00.000Z',
    updated_at: '2026-03-02T15:00:00.000Z',
    store_name: STORE_NAMES[0],
  },
  {
    id: 'camp-009',
    store_id: STORE_IDS[1],
    name: 'Fresh Mart — Suspended Campaign',
    description: 'This campaign was suspended for click fraud investigation',
    campaign_type: 'sponsored_listing',
    status: 'suspended',
    budget_type: 'total',
    budget_amount: 6000,
    spent_amount: 2800,
    daily_budget: 300,
    daily_spent: 0,
    daily_spent_date: null,
    bid_type: 'cpc',
    bid_amount: 2.20,
    targeting: { keywords: ['fresh', 'organic', 'vegetables'] },
    placement: 'search_results',
    banner_image_url: null,
    banner_link_url: null,
    start_date: '2026-02-01T00:00:00.000Z',
    end_date: '2026-03-31T23:59:59.000Z',
    total_impressions: 32000,
    total_clicks: 1272,
    total_conversions: 67,
    conversion_revenue: 8710,
    rejection_reason: null,
    suspension_reason: 'Unusual click patterns detected. Campaign suspended pending fraud investigation.',
    approved_by: ADMIN_IDS[0],
    approved_at: '2026-01-31T12:00:00.000Z',
    created_by: USER_IDS[1],
    created_at: '2026-01-30T10:00:00.000Z',
    updated_at: '2026-02-28T14:00:00.000Z',
    store_name: STORE_NAMES[1],
  },
  {
    id: 'camp-010',
    store_id: STORE_IDS[0],
    name: 'Cancelled Promo Test',
    description: 'Test campaign that was cancelled before activation',
    campaign_type: 'product_promotion',
    status: 'cancelled',
    budget_type: 'total',
    budget_amount: 1000,
    spent_amount: 0,
    daily_budget: null,
    daily_spent: 0,
    daily_spent_date: null,
    bid_type: 'cpc',
    bid_amount: 1.50,
    targeting: {},
    placement: 'product_page',
    banner_image_url: null,
    banner_link_url: null,
    start_date: '2026-03-15T00:00:00.000Z',
    end_date: '2026-03-20T23:59:59.000Z',
    total_impressions: 0,
    total_clicks: 0,
    total_conversions: 0,
    conversion_revenue: 0,
    rejection_reason: null,
    suspension_reason: null,
    approved_by: null,
    approved_at: null,
    created_by: USER_IDS[0],
    created_at: '2026-03-01T08:00:00.000Z',
    updated_at: '2026-03-01T09:00:00.000Z',
    store_name: STORE_NAMES[0],
  },
  {
    id: 'camp-011',
    store_id: STORE_IDS[2],
    name: 'Metro Grocery — Approved Awaiting Start',
    description: 'Approved campaign waiting for start date',
    campaign_type: 'sponsored_listing',
    status: 'approved',
    budget_type: 'total',
    budget_amount: 7000,
    spent_amount: 0,
    daily_budget: 350,
    daily_spent: 0,
    daily_spent_date: null,
    bid_type: 'cpc',
    bid_amount: 2.80,
    targeting: { categories: ['cat-grocery-001', 'cat-beverage-003'] },
    placement: 'search_results',
    banner_image_url: null,
    banner_link_url: null,
    start_date: '2026-03-10T00:00:00.000Z',
    end_date: '2026-04-10T23:59:59.000Z',
    total_impressions: 0,
    total_clicks: 0,
    total_conversions: 0,
    conversion_revenue: 0,
    rejection_reason: null,
    suspension_reason: null,
    approved_by: ADMIN_IDS[1],
    approved_at: '2026-03-02T16:00:00.000Z',
    created_by: USER_IDS[2],
    created_at: '2026-03-01T14:00:00.000Z',
    updated_at: '2026-03-02T16:00:00.000Z',
    store_name: STORE_NAMES[2],
  },
];

// ── Campaign Products ────────────────────────────────────

export const campaignProducts: MockCampaignProduct[] = [
  { id: 'cp-001', campaign_id: 'camp-001', product_id: PRODUCT_IDS[0], bid_amount: null, impressions: 8500, clicks: 280, conversions: 34, spent: 700, is_active: true, created_at: '2026-02-15T00:00:00.000Z', product_name: PRODUCT_NAMES[0], product_image_url: '/images/piattos.jpg' },
  { id: 'cp-002', campaign_id: 'camp-001', product_id: PRODUCT_IDS[6], bid_amount: 3.00, impressions: 9200, clicks: 257, conversions: 30, spent: 642.50, is_active: true, created_at: '2026-02-15T00:00:00.000Z', product_name: PRODUCT_NAMES[6], product_image_url: '/images/argentina.jpg' },
  { id: 'cp-003', campaign_id: 'camp-001', product_id: PRODUCT_IDS[7], bid_amount: null, impressions: 6800, clicks: 200, conversions: 25, spent: 500, is_active: true, created_at: '2026-02-15T00:00:00.000Z', product_name: PRODUCT_NAMES[7], product_image_url: '/images/mega-sardines.jpg' },
  { id: 'cp-004', campaign_id: 'camp-004', product_id: PRODUCT_IDS[2], bid_amount: null, impressions: 7500, clicks: 275, conversions: 22, spent: 825, is_active: true, created_at: '2026-02-01T00:00:00.000Z', product_name: PRODUCT_NAMES[2], product_image_url: '/images/bear-brand.jpg' },
  { id: 'cp-005', campaign_id: 'camp-004', product_id: PRODUCT_IDS[4], bid_amount: 3.50, impressions: 7700, clicks: 275, conversions: 23, spent: 825, is_active: true, created_at: '2026-02-01T00:00:00.000Z', product_name: PRODUCT_NAMES[4], product_image_url: '/images/c2-green-tea.jpg' },
  { id: 'cp-006', campaign_id: 'camp-006', product_id: PRODUCT_IDS[3], bid_amount: null, impressions: 10200, clicks: 530, conversions: 62, spent: 1060, is_active: false, created_at: '2026-02-10T00:00:00.000Z', product_name: PRODUCT_NAMES[3], product_image_url: '/images/kopiko.jpg' },
  { id: 'cp-007', campaign_id: 'camp-006', product_id: PRODUCT_IDS[5], bid_amount: null, impressions: 8500, clicks: 460, conversions: 50, spent: 920, is_active: false, created_at: '2026-02-10T00:00:00.000Z', product_name: PRODUCT_NAMES[5], product_image_url: '/images/san-miguel.jpg' },
];

// ── Stats Helpers ────────────────────────────────────────

export function computeCampaignStats(items: MockCampaign[]): MockCampaignStats {
  return {
    total: items.length,
    draft: items.filter((c) => c.status === 'draft').length,
    pending_review: items.filter((c) => c.status === 'pending_review').length,
    approved: items.filter((c) => c.status === 'approved').length,
    active: items.filter((c) => c.status === 'active').length,
    paused: items.filter((c) => c.status === 'paused').length,
    completed: items.filter((c) => c.status === 'completed').length,
    rejected: items.filter((c) => c.status === 'rejected').length,
    cancelled: items.filter((c) => c.status === 'cancelled').length,
    suspended: items.filter((c) => c.status === 'suspended').length,
  };
}

export function computePlatformAdStats(items: MockCampaign[]): MockPlatformAdStats {
  const totalClicks = items.reduce((s, c) => s + c.total_clicks, 0);
  const totalSpend = items.reduce((s, c) => s + c.spent_amount, 0);
  return {
    total_spend: totalSpend,
    total_impressions: items.reduce((s, c) => s + c.total_impressions, 0),
    total_clicks: totalClicks,
    total_conversions: items.reduce((s, c) => s + c.total_conversions, 0),
    avg_cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
    total_campaigns: items.length,
    active_campaigns: items.filter((c) => c.status === 'active').length,
    by_status: computeCampaignStats(items),
  };
}

export function generateCampaignPerformance(campaign: MockCampaign, days: number = 30): MockCampaignPerformance {
  const daily: MockCampaignPerformance['daily'] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dayImpressions = campaign.status === 'active' || campaign.status === 'completed'
      ? Math.floor(campaign.total_impressions / days * (0.7 + Math.random() * 0.6))
      : 0;
    const dayClicks = Math.floor(dayImpressions * (0.02 + Math.random() * 0.03));
    const dayConversions = Math.floor(dayClicks * (0.08 + Math.random() * 0.1));
    const daySpent = campaign.bid_type === 'cpc'
      ? dayClicks * campaign.bid_amount
      : dayImpressions * campaign.bid_amount / 1000;
    daily.push({
      date: date.toISOString().split('T')[0],
      impressions: dayImpressions,
      clicks: dayClicks,
      conversions: dayConversions,
      spent: Math.round(daySpent * 100) / 100,
    });
  }
  const ctr = campaign.total_impressions > 0 ? (campaign.total_clicks / campaign.total_impressions) * 100 : 0;
  const convRate = campaign.total_clicks > 0 ? (campaign.total_conversions / campaign.total_clicks) * 100 : 0;
  const avgCpc = campaign.total_clicks > 0 ? campaign.spent_amount / campaign.total_clicks : 0;
  const roas = campaign.spent_amount > 0 ? campaign.conversion_revenue / campaign.spent_amount : 0;

  return {
    campaign_id: campaign.id,
    total_impressions: campaign.total_impressions,
    total_clicks: campaign.total_clicks,
    total_conversions: campaign.total_conversions,
    total_spent: campaign.spent_amount,
    conversion_revenue: campaign.conversion_revenue,
    ctr: Math.round(ctr * 100) / 100,
    conversion_rate: Math.round(convRate * 100) / 100,
    avg_cpc: Math.round(avgCpc * 100) / 100,
    roas: Math.round(roas * 100) / 100,
    daily,
  };
}
