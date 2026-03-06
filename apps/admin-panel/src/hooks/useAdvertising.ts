import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: { page: number; limit: number; total: number };
  timestamp: string;
}

// ── Types (snake_case — admin panel convention) ─────────

export type CampaignType = 'sponsored_listing' | 'banner_ad' | 'featured_store' | 'product_promotion';
export type CampaignStatus = 'draft' | 'pending_review' | 'approved' | 'active' | 'paused' | 'completed' | 'rejected' | 'cancelled' | 'suspended';
export type BudgetType = 'daily' | 'total';
export type BidType = 'cpc' | 'cpm' | 'flat';
export type AdPlacement = 'search_results' | 'home_page' | 'category_page' | 'store_page' | 'product_page';

export interface Campaign {
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
  bid_type: BidType;
  bid_amount: number;
  targeting: {
    categories?: string[];
    zones?: string[];
    customer_segments?: string[];
    keywords?: string[];
  };
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
  store_name?: string;
}

export interface CampaignStats {
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

export interface PlatformAdStats {
  total_spend: number;
  total_impressions: number;
  total_clicks: number;
  total_conversions: number;
  avg_cpc: number;
  total_campaigns: number;
  active_campaigns: number;
  by_status: CampaignStats;
}

export interface CampaignPerformance {
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

export interface AdminCampaignFilters {
  search?: string;
  status?: string;
  campaign_type?: string;
  placement?: string;
  store_id?: string;
  sort_by?: string;
  sort_order?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
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
  cpc: 'CPC',
  cpm: 'CPM',
  flat: 'Flat',
};

export const PLACEMENT_LABELS: Record<AdPlacement, string> = {
  search_results: 'Search Results',
  home_page: 'Home Page',
  category_page: 'Category Page',
  store_page: 'Store Page',
  product_page: 'Product Page',
};

// ── Query Hooks ─────────────────────────────────────────

export function useAdminCampaigns(filters: AdminCampaignFilters = {}) {
  return useQuery({
    queryKey: ['admin-campaigns', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.status) params.set('status', filters.status);
      if (filters.campaign_type) params.set('campaign_type', filters.campaign_type);
      if (filters.placement) params.set('placement', filters.placement);
      if (filters.store_id) params.set('store_id', filters.store_id);
      if (filters.sort_by) params.set('sort_by', filters.sort_by);
      if (filters.sort_order) params.set('sort_order', filters.sort_order);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));

      const { data } = await api.get<ApiResponse<Campaign[]>>(
        `/admin/advertising/campaigns?${params.toString()}`,
      );
      return { campaigns: data.data, meta: data.meta };
    },
  });
}

export function useAdminCampaignStats() {
  return useQuery({
    queryKey: ['admin-campaign-stats'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<CampaignStats>>('/admin/advertising/campaigns/stats');
      return data.data;
    },
    staleTime: 60_000,
  });
}

export function useAdminPlatformStats() {
  return useQuery({
    queryKey: ['admin-platform-ad-stats'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PlatformAdStats>>('/admin/advertising/stats');
      return data.data;
    },
    staleTime: 60_000,
  });
}

export function useAdminCampaign(id: string | undefined) {
  return useQuery({
    queryKey: ['admin-campaign', id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Campaign>>(`/admin/advertising/campaigns/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useAdminCampaignPerformance(id: string | undefined, days: number = 30) {
  return useQuery({
    queryKey: ['admin-campaign-performance', id, days],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<CampaignPerformance>>(
        `/admin/advertising/campaigns/${id}/performance?days=${days}`,
      );
      return data.data;
    },
    enabled: !!id,
  });
}

// ── Mutation Hooks ──────────────────────────────────────

export function useApproveCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch<ApiResponse<Campaign>>(
        `/admin/advertising/campaigns/${id}/approve`,
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-campaigns'] });
      qc.invalidateQueries({ queryKey: ['admin-campaign-stats'] });
      qc.invalidateQueries({ queryKey: ['admin-platform-ad-stats'] });
    },
  });
}

export function useRejectCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { data } = await api.patch<ApiResponse<Campaign>>(
        `/admin/advertising/campaigns/${id}/reject`,
        { reason },
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-campaigns'] });
      qc.invalidateQueries({ queryKey: ['admin-campaign-stats'] });
    },
  });
}

export function useSuspendCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { data } = await api.patch<ApiResponse<Campaign>>(
        `/admin/advertising/campaigns/${id}/suspend`,
        { reason },
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-campaigns'] });
      qc.invalidateQueries({ queryKey: ['admin-campaign-stats'] });
      qc.invalidateQueries({ queryKey: ['admin-platform-ad-stats'] });
    },
  });
}
