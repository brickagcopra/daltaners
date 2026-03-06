import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiResponse } from '@/lib/api';

// ── Types ──────────────────────────────────────────────

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

export interface Campaign {
  id: string;
  storeId: string;
  name: string;
  description: string | null;
  campaignType: CampaignType;
  status: CampaignStatus;
  budgetType: BudgetType;
  budgetAmount: number;
  spentAmount: number;
  dailyBudget: number | null;
  dailySpent: number;
  bidType: BidType;
  bidAmount: number;
  targeting: CampaignTargeting;
  placement: AdPlacement;
  bannerImageUrl: string | null;
  bannerLinkUrl: string | null;
  startDate: string;
  endDate: string | null;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  conversionRevenue: number;
  rejectionReason: string | null;
  suspensionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignProduct {
  id: string;
  campaignId: string;
  productId: string;
  bidAmount: number | null;
  impressions: number;
  clicks: number;
  conversions: number;
  spent: number;
  isActive: boolean;
  createdAt: string;
  productName?: string;
  productImageUrl?: string;
}

export interface CampaignPerformance {
  campaignId: string;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  totalSpent: number;
  conversionRevenue: number;
  ctr: number;
  conversionRate: number;
  avgCpc: number;
  roas: number;
  daily: { date: string; impressions: number; clicks: number; conversions: number; spent: number }[];
}

export interface CampaignStats {
  total: number;
  draft: number;
  pendingReview: number;
  approved: number;
  active: number;
  paused: number;
  completed: number;
  rejected: number;
  cancelled: number;
  suspended: number;
}

export interface CampaignFilters {
  search?: string;
  status?: string;
  campaign_type?: string;
  placement?: string;
  page?: number;
  limit?: number;
}

export interface CreateCampaignData {
  name: string;
  description?: string;
  campaign_type: CampaignType;
  budget_type?: BudgetType;
  budget_amount: number;
  daily_budget?: number;
  bid_type?: BidType;
  bid_amount: number;
  targeting?: CampaignTargeting;
  placement?: AdPlacement;
  banner_image_url?: string;
  banner_link_url?: string;
  start_date: string;
  end_date?: string;
  product_ids?: string[];
}

// ── Label & Color Constants ─────────────────────────────

export const CAMPAIGN_TYPE_LABELS: Record<CampaignType, string> = {
  sponsored_listing: 'Sponsored Listing',
  banner_ad: 'Banner Ad',
  featured_store: 'Featured Store',
  product_promotion: 'Product Promotion',
};

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: 'Draft',
  pending_review: 'Pending Review',
  approved: 'Approved',
  active: 'Active',
  paused: 'Paused',
  completed: 'Completed',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  suspended: 'Suspended',
};

export const CAMPAIGN_STATUS_COLORS: Record<CampaignStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending_review: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  paused: 'bg-orange-100 text-orange-700',
  completed: 'bg-purple-100 text-purple-700',
  rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
  suspended: 'bg-red-100 text-red-800',
};

export const BID_TYPE_LABELS: Record<BidType, string> = {
  cpc: 'Cost Per Click',
  cpm: 'Cost Per 1000 Impressions',
  flat: 'Flat Rate',
};

export const PLACEMENT_LABELS: Record<AdPlacement, string> = {
  search_results: 'Search Results',
  home_page: 'Home Page',
  category_page: 'Category Page',
  store_page: 'Store Page',
  product_page: 'Product Page',
};

export const BUDGET_TYPE_LABELS: Record<BudgetType, string> = {
  daily: 'Daily',
  total: 'Total',
};

// ── Transforms (snake_case → camelCase) ─────────────────

function transformCampaign(raw: Record<string, unknown>): Campaign {
  return {
    id: raw.id as string,
    storeId: raw.store_id as string,
    name: raw.name as string,
    description: raw.description as string | null,
    campaignType: raw.campaign_type as CampaignType,
    status: raw.status as CampaignStatus,
    budgetType: raw.budget_type as BudgetType,
    budgetAmount: raw.budget_amount as number,
    spentAmount: raw.spent_amount as number,
    dailyBudget: raw.daily_budget as number | null,
    dailySpent: raw.daily_spent as number,
    bidType: raw.bid_type as BidType,
    bidAmount: raw.bid_amount as number,
    targeting: raw.targeting as CampaignTargeting,
    placement: raw.placement as AdPlacement,
    bannerImageUrl: raw.banner_image_url as string | null,
    bannerLinkUrl: raw.banner_link_url as string | null,
    startDate: raw.start_date as string,
    endDate: raw.end_date as string | null,
    totalImpressions: raw.total_impressions as number,
    totalClicks: raw.total_clicks as number,
    totalConversions: raw.total_conversions as number,
    conversionRevenue: raw.conversion_revenue as number,
    rejectionReason: raw.rejection_reason as string | null,
    suspensionReason: raw.suspension_reason as string | null,
    createdAt: raw.created_at as string,
    updatedAt: raw.updated_at as string,
  };
}

function transformProduct(raw: Record<string, unknown>): CampaignProduct {
  return {
    id: raw.id as string,
    campaignId: raw.campaign_id as string,
    productId: raw.product_id as string,
    bidAmount: raw.bid_amount as number | null,
    impressions: raw.impressions as number,
    clicks: raw.clicks as number,
    conversions: raw.conversions as number,
    spent: raw.spent as number,
    isActive: raw.is_active as boolean,
    createdAt: raw.created_at as string,
    productName: raw.product_name as string | undefined,
    productImageUrl: raw.product_image_url as string | undefined,
  };
}

function transformPerformance(raw: Record<string, unknown>): CampaignPerformance {
  return {
    campaignId: raw.campaign_id as string,
    totalImpressions: raw.total_impressions as number,
    totalClicks: raw.total_clicks as number,
    totalConversions: raw.total_conversions as number,
    totalSpent: raw.total_spent as number,
    conversionRevenue: raw.conversion_revenue as number,
    ctr: raw.ctr as number,
    conversionRate: raw.conversion_rate as number,
    avgCpc: raw.avg_cpc as number,
    roas: raw.roas as number,
    daily: raw.daily as CampaignPerformance['daily'],
  };
}

function transformStats(raw: Record<string, unknown>): CampaignStats {
  return {
    total: raw.total as number,
    draft: raw.draft as number,
    pendingReview: raw.pending_review as number,
    approved: raw.approved as number,
    active: raw.active as number,
    paused: raw.paused as number,
    completed: raw.completed as number,
    rejected: raw.rejected as number,
    cancelled: raw.cancelled as number,
    suspended: raw.suspended as number,
  };
}

// ── Query Hooks ─────────────────────────────────────────

export function useCampaigns(filters: CampaignFilters = {}) {
  return useQuery({
    queryKey: ['vendor-campaigns', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.status) params.set('status', filters.status);
      if (filters.campaign_type) params.set('campaign_type', filters.campaign_type);
      if (filters.placement) params.set('placement', filters.placement);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));

      const { data } = await api.get<ApiResponse<Record<string, unknown>[]>>(
        `/advertising/campaigns?${params.toString()}`,
      );
      return {
        campaigns: data.data.map(transformCampaign),
        meta: data.meta,
      };
    },
  });
}

export function useCampaign(id: string | undefined) {
  return useQuery({
    queryKey: ['vendor-campaign', id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Record<string, unknown>>>(
        `/advertising/campaigns/${id}`,
      );
      return transformCampaign(data.data);
    },
    enabled: !!id,
  });
}

export function useCampaignStats() {
  return useQuery({
    queryKey: ['vendor-campaign-stats'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Record<string, unknown>>>(
        '/advertising/campaigns/stats',
      );
      return transformStats(data.data);
    },
    staleTime: 60_000,
  });
}

export function useCampaignPerformance(id: string | undefined, days: number = 30) {
  return useQuery({
    queryKey: ['vendor-campaign-performance', id, days],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Record<string, unknown>>>(
        `/advertising/campaigns/${id}/performance?days=${days}`,
      );
      return transformPerformance(data.data);
    },
    enabled: !!id,
  });
}

export function useCampaignProducts(id: string | undefined) {
  return useQuery({
    queryKey: ['vendor-campaign-products', id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Record<string, unknown>[]>>(
        `/advertising/campaigns/${id}/products`,
      );
      return data.data.map(transformProduct);
    },
    enabled: !!id,
  });
}

// ── Mutation Hooks ──────────────────────────────────────

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (campaignData: CreateCampaignData) => {
      const { data } = await api.post<ApiResponse<Record<string, unknown>>>(
        '/advertising/campaigns',
        campaignData,
      );
      return transformCampaign(data.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendor-campaigns'] });
      qc.invalidateQueries({ queryKey: ['vendor-campaign-stats'] });
    },
  });
}

export function useUpdateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<CreateCampaignData>) => {
      const { data } = await api.patch<ApiResponse<Record<string, unknown>>>(
        `/advertising/campaigns/${id}`,
        updates,
      );
      return transformCampaign(data.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendor-campaigns'] });
      qc.invalidateQueries({ queryKey: ['vendor-campaign-stats'] });
    },
  });
}

export function useDeleteCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/advertising/campaigns/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendor-campaigns'] });
      qc.invalidateQueries({ queryKey: ['vendor-campaign-stats'] });
    },
  });
}

export function useSubmitCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch<ApiResponse<Record<string, unknown>>>(
        `/advertising/campaigns/${id}/submit`,
      );
      return transformCampaign(data.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendor-campaigns'] });
      qc.invalidateQueries({ queryKey: ['vendor-campaign-stats'] });
    },
  });
}

export function usePauseCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch<ApiResponse<Record<string, unknown>>>(
        `/advertising/campaigns/${id}/pause`,
      );
      return transformCampaign(data.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendor-campaigns'] });
      qc.invalidateQueries({ queryKey: ['vendor-campaign-stats'] });
    },
  });
}

export function useResumeCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch<ApiResponse<Record<string, unknown>>>(
        `/advertising/campaigns/${id}/resume`,
      );
      return transformCampaign(data.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendor-campaigns'] });
      qc.invalidateQueries({ queryKey: ['vendor-campaign-stats'] });
    },
  });
}

export function useCancelCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch<ApiResponse<Record<string, unknown>>>(
        `/advertising/campaigns/${id}/cancel`,
      );
      return transformCampaign(data.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendor-campaigns'] });
      qc.invalidateQueries({ queryKey: ['vendor-campaign-stats'] });
    },
  });
}

export function useAddCampaignProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ campaignId, productId, bidAmount }: { campaignId: string; productId: string; bidAmount?: number }) => {
      const { data } = await api.post<ApiResponse<Record<string, unknown>>>(
        `/advertising/campaigns/${campaignId}/products`,
        { product_id: productId, bid_amount: bidAmount },
      );
      return transformProduct(data.data);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['vendor-campaign-products', vars.campaignId] });
    },
  });
}

export function useRemoveCampaignProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ campaignId, productId }: { campaignId: string; productId: string }) => {
      await api.delete(`/advertising/campaigns/${campaignId}/products/${productId}`);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['vendor-campaign-products', vars.campaignId] });
    },
  });
}
