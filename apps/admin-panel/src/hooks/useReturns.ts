import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export type ReturnStatus = 'pending' | 'approved' | 'denied' | 'cancelled' | 'received' | 'refunded' | 'escalated';
export type ReturnReasonCategory = 'defective' | 'wrong_item' | 'damaged' | 'not_as_described' | 'missing_item' | 'expired' | 'change_of_mind' | 'other';

export interface ReturnItem {
  id: string;
  return_request_id: string;
  order_item_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  refund_amount: number;
  condition: string;
  restockable: boolean;
  inventory_adjusted: boolean;
}

export interface ReturnRequest {
  id: string;
  order_id: string;
  customer_id: string;
  store_id: string;
  request_number: string;
  status: ReturnStatus;
  reason_category: ReturnReasonCategory;
  reason_details: string | null;
  evidence_urls: string[];
  requested_resolution: string;
  refund_amount: number;
  vendor_response: string | null;
  vendor_responded_at: string | null;
  admin_notes: string | null;
  items: ReturnItem[];
  created_at: string;
  updated_at: string;
}

export interface ReturnStats {
  total: number;
  by_status: Record<string, number>;
  by_reason: Record<string, number>;
  total_refund_amount: number;
  avg_resolution_hours: number;
}

interface ReturnsFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: ReturnStatus;
  reason_category?: ReturnReasonCategory;
  store_id?: string;
  customer_id?: string;
  date_from?: string;
  date_to?: string;
}

interface ReturnsResponse {
  success: boolean;
  data: ReturnRequest[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

interface ReturnResponse {
  success: boolean;
  data: ReturnRequest;
}

interface ReturnStatsResponse {
  success: boolean;
  data: ReturnStats;
}

export function useAllReturns(filters: ReturnsFilters = {}) {
  const {
    page = 1, limit = 20, search, status, reason_category,
    store_id, customer_id, date_from, date_to,
  } = filters;

  return useQuery({
    queryKey: ['admin', 'returns', { page, limit, search, status, reason_category, store_id, customer_id, date_from, date_to }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      if (reason_category) params.set('reason_category', reason_category);
      if (store_id) params.set('store_id', store_id);
      if (customer_id) params.set('customer_id', customer_id);
      if (date_from) params.set('date_from', date_from);
      if (date_to) params.set('date_to', date_to);

      const response = await api.get<ReturnsResponse>(`/admin/returns?${params.toString()}`);
      return response.data;
    },
  });
}

export function useReturnDetail(id: string) {
  return useQuery({
    queryKey: ['admin', 'return', id],
    queryFn: async () => {
      const response = await api.get<ReturnResponse>(`/admin/returns/${id}`);
      return response.data.data;
    },
    enabled: !!id,
  });
}

const defaultStats: ReturnStats = {
  total: 0,
  by_status: {},
  by_reason: {},
  total_refund_amount: 0,
  avg_resolution_hours: 0,
};

export function useReturnStats(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ['admin', 'returns', 'stats', dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);

      const response = await api.get<ReturnStatsResponse>(`/admin/returns/stats?${params.toString()}`);
      const raw = response.data;
      const stats = raw?.data && typeof raw.data === 'object' && 'total' in raw.data
        ? raw.data
        : defaultStats;
      return { success: true, data: stats } as ReturnStatsResponse;
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useEscalateReturn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      admin_notes,
      refund_amount,
    }: {
      id: string;
      admin_notes?: string;
      refund_amount?: number;
    }) => {
      const response = await api.patch<ReturnResponse>(
        `/admin/returns/${id}/escalate`,
        { admin_notes, refund_amount },
      );
      return response.data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'returns'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'return', variables.id] });
    },
  });
}

export function useOverrideApproveReturn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      admin_notes,
      refund_amount,
    }: {
      id: string;
      admin_notes?: string;
      refund_amount?: number;
    }) => {
      const response = await api.patch<ReturnResponse>(
        `/admin/returns/${id}/override-approve`,
        { admin_notes, refund_amount },
      );
      return response.data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'returns'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'return', variables.id] });
    },
  });
}

export function useOverrideDenyReturn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      admin_notes,
    }: {
      id: string;
      admin_notes?: string;
    }) => {
      const response = await api.patch<ReturnResponse>(
        `/admin/returns/${id}/override-deny`,
        { admin_notes },
      );
      return response.data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'returns'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'return', variables.id] });
    },
  });
}

export const RETURN_STATUS_LABELS: Record<ReturnStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  denied: 'Denied',
  cancelled: 'Cancelled',
  received: 'Received',
  refunded: 'Refunded',
  escalated: 'Escalated',
};

export const RETURN_STATUS_COLORS: Record<ReturnStatus, string> = {
  pending: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  denied: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
  received: 'bg-purple-100 text-purple-800',
  refunded: 'bg-emerald-100 text-emerald-800',
  escalated: 'bg-orange-100 text-orange-800',
};

export const RETURN_REASON_LABELS: Record<ReturnReasonCategory, string> = {
  defective: 'Product is defective',
  wrong_item: 'Wrong item received',
  damaged: 'Item arrived damaged',
  not_as_described: 'Not as described',
  missing_item: 'Missing item from order',
  expired: 'Product expired',
  change_of_mind: 'Changed my mind',
  other: 'Other reason',
};
