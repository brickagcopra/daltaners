import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type ReturnStatus = 'pending' | 'approved' | 'denied' | 'cancelled' | 'received' | 'refunded' | 'escalated';
export type ReturnReasonCategory = 'defective' | 'wrong_item' | 'damaged' | 'not_as_described' | 'missing_item' | 'expired' | 'change_of_mind' | 'other';
export type ReturnResolution = 'refund' | 'replacement' | 'store_credit';
export type ReturnItemCondition = 'unopened' | 'opened' | 'damaged' | 'defective' | 'unknown';

export interface ReturnItem {
  id: string;
  return_request_id: string;
  order_item_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  refund_amount: number;
  condition: ReturnItemCondition;
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
  requested_resolution: ReturnResolution;
  refund_amount: number;
  vendor_response: string | null;
  vendor_responded_at: string | null;
  admin_notes: string | null;
  items: ReturnItem[];
  created_at: string;
  updated_at: string;
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

export interface CreateReturnPayload {
  order_id: string;
  reason_category: ReturnReasonCategory;
  reason_details?: string;
  evidence_urls?: string[];
  requested_resolution?: ReturnResolution;
  items: {
    order_item_id: string;
    quantity: number;
    condition?: ReturnItemCondition;
  }[];
}

export interface ReturnFilters {
  page?: number;
  limit?: number;
  status?: ReturnStatus;
  reason_category?: ReturnReasonCategory;
  date_from?: string;
  date_to?: string;
}

export function useMyReturns(filters: ReturnFilters = {}) {
  const { page = 1, limit = 10, status, reason_category, date_from, date_to } = filters;

  return useQuery({
    queryKey: ['my-returns', { page, limit, status, reason_category, date_from, date_to }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (status) params.set('status', status);
      if (reason_category) params.set('reason_category', reason_category);
      if (date_from) params.set('date_from', date_from);
      if (date_to) params.set('date_to', date_to);

      const { data } = await api.get<ReturnsResponse>(`/returns/my?${params.toString()}`);
      return data;
    },
  });
}

export function useReturn(id: string) {
  return useQuery({
    queryKey: ['return', id],
    queryFn: async () => {
      const { data } = await api.get<ReturnResponse>(`/returns/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCreateReturn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateReturnPayload) => {
      const { data } = await api.post<ReturnResponse>('/returns', payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-returns'] });
    },
  });
}

export function useCancelReturn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch<ReturnResponse>(`/returns/${id}/cancel`);
      return data.data;
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['return', id] });
      queryClient.invalidateQueries({ queryKey: ['my-returns'] });
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

export const RETURN_RESOLUTION_LABELS: Record<ReturnResolution, string> = {
  refund: 'Full Refund',
  replacement: 'Replacement',
  store_credit: 'Store Credit',
};

export const RETURN_CONDITION_LABELS: Record<ReturnItemCondition, string> = {
  unopened: 'Unopened',
  opened: 'Opened',
  damaged: 'Damaged',
  defective: 'Defective',
  unknown: 'Unknown',
};
