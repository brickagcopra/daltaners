import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface SponsoredProduct {
  campaign_id: string;
  campaign_product_id: string;
  product_id: string;
  product_name: string;
  product_slug: string;
  product_image_url: string | null;
  base_price: number;
  sale_price: number | null;
  store_id: string;
  store_name: string;
  rating_average: number;
  bid_amount: number;
  placement: string;
}

interface SponsoredBanner {
  campaign_id: string;
  name: string;
  banner_image_url: string;
  banner_link_url: string;
  placement: string;
}

interface SponsoredResponse {
  success: boolean;
  data: SponsoredProduct[];
}

interface BannerResponse {
  success: boolean;
  data: SponsoredBanner[];
}

export function useSponsoredProducts(placement: string, limit: number = 4) {
  return useQuery({
    queryKey: ['sponsored-products', placement, limit],
    queryFn: async () => {
      const { data } = await api.get<SponsoredResponse>(
        `/advertising/sponsored-products?placement=${placement}&limit=${limit}`,
      );
      return data?.data ?? [];
    },
    staleTime: 120_000,
  });
}

export function useSponsoredBanners(placement: string) {
  return useQuery({
    queryKey: ['sponsored-banners', placement],
    queryFn: async () => {
      const { data } = await api.get<BannerResponse>(
        `/advertising/banners?placement=${placement}`,
      );
      return data?.data ?? [];
    },
    staleTime: 120_000,
  });
}

export function useTrackImpression() {
  return useMutation({
    mutationFn: async (params: { campaign_id: string; campaign_product_id?: string; placement: string }) => {
      await api.post('/advertising/impressions', params);
    },
  });
}

export function useTrackClick() {
  return useMutation({
    mutationFn: async (params: { campaign_id: string; campaign_product_id?: string; placement: string }) => {
      await api.post('/advertising/clicks', params);
    },
  });
}

export type { SponsoredProduct, SponsoredBanner };
