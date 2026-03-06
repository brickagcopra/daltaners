import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type ApiResponse } from '@/lib/api';
import type { Shift, CashMovement } from '@/types/pos';

export function useShiftsByStore(storeId: string | undefined) {
  return useQuery({
    queryKey: ['pos', 'shifts', 'store', storeId],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Shift[]>>(`/pos/shifts/store/${storeId}`);
      return data.data;
    },
    enabled: !!storeId,
  });
}

export function useShift(id: string | undefined) {
  return useQuery({
    queryKey: ['pos', 'shift', id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Shift>>(`/pos/shifts/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useOpenShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { terminal_id: string; opening_cash: number; cashier_name?: string }) => {
      const { data } = await api.post<ApiResponse<Shift>>('/pos/shifts/open', dto);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pos', 'shifts'] }),
  });
}

export function useCloseShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ shiftId, ...dto }: { shiftId: string; closing_cash: number; close_notes?: string }) => {
      const { data } = await api.post<ApiResponse<Shift>>(`/pos/shifts/${shiftId}/close`, dto);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pos', 'shifts'] }),
  });
}

export function useCashMovements(shiftId: string | undefined) {
  return useQuery({
    queryKey: ['pos', 'cash-movements', shiftId],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<CashMovement[]>>(`/pos/shifts/${shiftId}/cash-movements`);
      return data.data;
    },
    enabled: !!shiftId,
  });
}

export function useCreateCashMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ shiftId, ...dto }: { shiftId: string; type: string; amount: number; reason?: string }) => {
      const { data } = await api.post<ApiResponse<CashMovement>>(`/pos/shifts/${shiftId}/cash-movements`, dto);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pos', 'cash-movements'] }),
  });
}
