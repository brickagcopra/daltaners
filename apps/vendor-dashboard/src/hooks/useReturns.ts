import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiResponse } from '@/lib/api';

export type ReturnStatus = 'pending' | 'approved' | 'denied' | 'cancelled' | 'received' | 'refunded' | 'escalated';
export type ReturnReasonCategory = 'defective' | 'wrong_item' | 'damaged' | 'not_as_described' | 'missing_item' | 'expired' | 'change_of_mind' | 'other';

export interface ReturnItem {
  id: string;
  returnRequestId: string;
  orderItemId: string;
  productId: string | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  refundAmount: number;
  condition: string;
  restockable: boolean;
  inventoryAdjusted: boolean;
}

export interface ReturnRequest {
  id: string;
  orderId: string;
  customerId: string;
  storeId: string;
  requestNumber: string;
  status: ReturnStatus;
  reasonCategory: ReturnReasonCategory;
  reasonDetails: string | null;
  evidenceUrls: string[];
  requestedResolution: string;
  refundAmount: number;
  vendorResponse: string | null;
  vendorRespondedAt: string | null;
  adminNotes: string | null;
  items: ReturnItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ReturnFilters {
  status?: ReturnStatus | 'all';
  page?: number;
  limit?: number;
  reasonCategory?: ReturnReasonCategory;
  dateFrom?: string;
  dateTo?: string;
}

export function useVendorReturns(filters: ReturnFilters = {}) {
  return useQuery({
    queryKey: ['vendor-returns', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status && filters.status !== 'all') params.set('status', filters.status);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));
      if (filters.reasonCategory) params.set('reason_category', filters.reasonCategory);
      if (filters.dateFrom) params.set('date_from', filters.dateFrom);
      if (filters.dateTo) params.set('date_to', filters.dateTo);

      const { data } = await api.get<ApiResponse<ReturnRequest[]>>(
        `/vendor/returns?${params.toString()}`,
      );
      return data;
    },
    refetchInterval: 30000,
  });
}

export function useVendorReturn(returnId: string | undefined) {
  return useQuery({
    queryKey: ['vendor-return', returnId],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ReturnRequest>>(`/vendor/returns/${returnId}`);
      return data.data;
    },
    enabled: !!returnId,
  });
}

export function useApproveReturn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      returnId,
      vendorResponse,
      refundAmount,
    }: {
      returnId: string;
      vendorResponse?: string;
      refundAmount?: number;
    }) => {
      const { data } = await api.patch<ApiResponse<ReturnRequest>>(
        `/vendor/returns/${returnId}/approve`,
        { vendor_response: vendorResponse, refund_amount: refundAmount },
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-returns'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-return'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}

export function useDenyReturn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      returnId,
      vendorResponse,
    }: {
      returnId: string;
      vendorResponse: string;
    }) => {
      const { data } = await api.patch<ApiResponse<ReturnRequest>>(
        `/vendor/returns/${returnId}/deny`,
        { vendor_response: vendorResponse },
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-returns'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-return'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}

export function useMarkReturnReceived() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      returnId,
      vendorResponse,
      restockable,
    }: {
      returnId: string;
      vendorResponse?: string;
      restockable?: boolean;
    }) => {
      const { data } = await api.patch<ApiResponse<ReturnRequest>>(
        `/vendor/returns/${returnId}/received`,
        { vendor_response: vendorResponse, restockable },
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-returns'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-return'] });
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
