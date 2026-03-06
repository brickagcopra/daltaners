import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface LoyaltyAccount {
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

interface LoyaltyTransaction {
  id: string;
  account_id: string;
  type: 'earn' | 'redeem' | 'bonus' | 'adjust' | 'expire';
  points: number;
  balance_after: number;
  reference_type: string | null;
  reference_id: string | null;
  description: string;
  created_at: string;
}

interface RedeemResult {
  points_redeemed: number;
  php_discount: number;
  new_balance: number;
  transaction_id: string;
}

export function useLoyaltyAccount() {
  return useQuery<LoyaltyAccount>({
    queryKey: ['loyalty-account'],
    queryFn: async () => {
      const { data } = await api.get('/loyalty/account');
      return data.data;
    },
  });
}

export function useLoyaltyTransactions(
  page: number = 1,
  limit: number = 20,
  type?: string,
) {
  return useQuery<{ items: LoyaltyTransaction[]; meta: { page: number; limit: number; total: number; totalPages: number } }>({
    queryKey: ['loyalty-transactions', page, limit, type],
    queryFn: async () => {
      const params: Record<string, unknown> = { page, limit };
      if (type) params.type = type;
      const { data } = await api.get('/loyalty/transactions', { params });
      return data.data;
    },
  });
}

export function useRedeemPoints() {
  const queryClient = useQueryClient();

  return useMutation<RedeemResult, Error, { points: number; order_id?: string }>({
    mutationFn: async (payload) => {
      const { data } = await api.post('/loyalty/redeem', payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-account'] });
      queryClient.invalidateQueries({ queryKey: ['loyalty-transactions'] });
    },
  });
}
