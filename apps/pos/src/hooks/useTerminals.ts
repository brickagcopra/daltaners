import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type ApiResponse } from '@/lib/api';
import type { Terminal } from '@/types/pos';

export function useTerminals(storeId: string | undefined) {
  return useQuery({
    queryKey: ['pos', 'terminals', storeId],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Terminal[]>>(`/pos/terminals/store/${storeId}`);
      return data.data;
    },
    enabled: !!storeId,
  });
}

export function useTerminal(id: string | undefined) {
  return useQuery({
    queryKey: ['pos', 'terminal', id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Terminal>>(`/pos/terminals/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCreateTerminal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { store_id: string; name: string; terminal_code: string; hardware_config?: Record<string, unknown>; ip_address?: string }) => {
      const { data } = await api.post<ApiResponse<Terminal>>('/pos/terminals', dto);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pos', 'terminals'] }),
  });
}

export function useUpdateTerminal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...dto }: { id: string; name?: string; status?: string; ip_address?: string }) => {
      const { data } = await api.patch<ApiResponse<Terminal>>(`/pos/terminals/${id}`, dto);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pos', 'terminals'] }),
  });
}
