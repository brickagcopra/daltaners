import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface LoyaltyAccount {
  id: string;
  user_id: string;
  account_type: string;
  points_balance: number;
  lifetime_points: number;
  tier: string;
  tier_expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoyaltyStats {
  total_accounts: number;
  active_accounts: number;
  by_tier: Record<string, number>;
  total_points_outstanding: number;
  avg_points_balance: number;
}

interface AdminLoyaltyQuery {
  page?: number;
  limit?: number;
  search?: string;
  tier?: string;
  account_type?: string;
}

export function useLoyaltyAccounts(params: AdminLoyaltyQuery = {}) {
  return useQuery({
    queryKey: ['admin-loyalty-accounts', params],
    queryFn: async () => {
      const { data } = await api.get('/loyalty/admin/accounts', { params });
      const inner = data.data ?? { items: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
      return inner as {
        items: LoyaltyAccount[];
        meta: { page: number; limit: number; total: number; totalPages: number };
      };
    },
  });
}

export function useLoyaltyStats() {
  return useQuery({
    queryKey: ['admin-loyalty-stats'],
    queryFn: async () => {
      const { data } = await api.get('/loyalty/admin/stats');
      return (data.data ?? null) as LoyaltyStats | null;
    },
  });
}

export function useAdjustLoyaltyPoints() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      accountId,
      points,
      reason,
    }: {
      accountId: string;
      points: number;
      reason: string;
    }) => {
      const { data } = await api.post(`/loyalty/admin/accounts/${accountId}/adjust`, {
        points,
        reason,
      });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-loyalty-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-loyalty-stats'] });
    },
  });
}
