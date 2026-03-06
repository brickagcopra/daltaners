import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface WalletTransaction {
  id: string;
  wallet_id: string;
  type: 'credit' | 'debit';
  amount: number;
  balance_after: number;
  description: string;
  reference_type: string | null;
  reference_id: string | null;
  created_at: string;
}

export function useWallet() {
  return useQuery<Wallet>({
    queryKey: ['wallet'],
    queryFn: async () => {
      const { data } = await api.get('/payments/wallet');
      return data.data;
    },
  });
}

export function useWalletTransactions(page: number = 1, limit: number = 20) {
  return useQuery<{ items: WalletTransaction[]; meta: { page: number; limit: number; total: number; totalPages: number } }>({
    queryKey: ['wallet-transactions', page, limit],
    queryFn: async () => {
      const { data } = await api.get('/payments/wallet/transactions', {
        params: { page, limit },
      });
      return data.data;
    },
  });
}

export function useTopupWallet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (amount: number) => {
      const { data } = await api.post('/payments/wallet/topup', { amount });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
    },
  });
}
