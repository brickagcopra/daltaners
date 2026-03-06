import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type ApiResponse } from '@/lib/api';
import type { Transaction } from '@/types/pos';

interface CreateTransactionItem {
  product_id: string;
  product_name: string;
  barcode?: string;
  sku?: string;
  unit_price: number;
  quantity: number;
  discount_amount?: number;
}

interface CreateTransactionDto {
  shift_id: string;
  type: 'sale' | 'refund' | 'exchange';
  payment_method: 'cash' | 'card' | 'gcash' | 'maya' | 'wallet';
  items: CreateTransactionItem[];
  amount_tendered?: number;
  discount_amount?: number;
  original_transaction_id?: string;
  refund_reason?: string;
}

export function useTransactionsByShift(shiftId: string | undefined) {
  return useQuery({
    queryKey: ['pos', 'transactions', 'shift', shiftId],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Transaction[]>>(`/pos/transactions/shift/${shiftId}`);
      return data.data;
    },
    enabled: !!shiftId,
  });
}

export function useTransactionsByStore(storeId: string | undefined, params?: { type?: string; status?: string }) {
  return useQuery({
    queryKey: ['pos', 'transactions', 'store', storeId, params],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Transaction[]>>(`/pos/transactions/store/${storeId}`, { params });
      return data.data;
    },
    enabled: !!storeId,
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateTransactionDto) => {
      const { data } = await api.post<ApiResponse<Transaction>>('/pos/transactions', dto);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pos', 'transactions'] });
      qc.invalidateQueries({ queryKey: ['pos', 'shifts'] });
    },
  });
}

export function useVoidTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, void_reason }: { id: string; void_reason: string }) => {
      const { data } = await api.post<ApiResponse<Transaction>>(`/pos/transactions/${id}/void`, { void_reason });
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pos', 'transactions'] }),
  });
}
