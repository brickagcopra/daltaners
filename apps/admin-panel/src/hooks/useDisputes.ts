import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export type DisputeStatus =
  | 'open'
  | 'vendor_response'
  | 'customer_reply'
  | 'under_review'
  | 'escalated'
  | 'resolved'
  | 'closed';

export type DisputeCategory =
  | 'order_not_received'
  | 'item_missing'
  | 'wrong_item'
  | 'damaged_item'
  | 'quality_issue'
  | 'overcharged'
  | 'late_delivery'
  | 'vendor_behavior'
  | 'delivery_behavior'
  | 'unauthorized_charge'
  | 'other';

export type DisputePriority = 'low' | 'medium' | 'high' | 'urgent';

export type DisputeResolutionType =
  | 'refund'
  | 'partial_refund'
  | 'replacement'
  | 'store_credit'
  | 'no_action'
  | 'warning_issued';

export interface DisputeMessage {
  id: string;
  dispute_id: string;
  sender_id: string;
  sender_role: 'customer' | 'vendor_owner' | 'vendor_staff' | 'admin';
  message: string;
  attachments: string[];
  is_internal: boolean;
  created_at: string;
}

export interface Dispute {
  id: string;
  dispute_number: string;
  order_id: string;
  return_request_id: string | null;
  customer_id: string;
  store_id: string;
  category: DisputeCategory;
  status: DisputeStatus;
  priority: DisputePriority;
  subject: string;
  description: string;
  evidence_urls: string[];
  requested_resolution: string;
  resolution_type: DisputeResolutionType | null;
  resolution_amount: number;
  resolution_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  escalated_at: string | null;
  escalation_reason: string | null;
  vendor_response_deadline: string | null;
  admin_assigned_to: string | null;
  messages: DisputeMessage[];
  created_at: string;
  updated_at: string;
}

export interface DisputeStats {
  total: number;
  by_status: Record<string, number>;
  by_category: Record<string, number>;
  by_priority: Record<string, number>;
  avg_resolution_hours: number;
  overdue_count: number;
}

interface DisputesFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: DisputeStatus;
  category?: DisputeCategory;
  priority?: DisputePriority;
  store_id?: string;
  customer_id?: string;
  assigned_to?: string;
  date_from?: string;
  date_to?: string;
}

interface DisputesResponse {
  success: boolean;
  data: Dispute[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

interface DisputeResponse {
  success: boolean;
  data: Dispute;
}

interface DisputeStatsResponse {
  success: boolean;
  data: DisputeStats;
}

interface DisputeMessagesResponse {
  success: boolean;
  data: DisputeMessage[];
}

export function useAllDisputes(filters: DisputesFilters = {}) {
  const {
    page = 1, limit = 20, search, status, category, priority,
    store_id, customer_id, assigned_to, date_from, date_to,
  } = filters;

  return useQuery({
    queryKey: ['admin', 'disputes', { page, limit, search, status, category, priority, store_id, customer_id, assigned_to, date_from, date_to }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      if (category) params.set('category', category);
      if (priority) params.set('priority', priority);
      if (store_id) params.set('store_id', store_id);
      if (customer_id) params.set('customer_id', customer_id);
      if (assigned_to) params.set('assigned_to', assigned_to);
      if (date_from) params.set('date_from', date_from);
      if (date_to) params.set('date_to', date_to);

      const response = await api.get<DisputesResponse>(`/admin/disputes?${params.toString()}`);
      return response.data;
    },
  });
}

export function useDisputeDetail(id: string) {
  return useQuery({
    queryKey: ['admin', 'dispute', id],
    queryFn: async () => {
      const response = await api.get<DisputeResponse>(`/admin/disputes/${id}`);
      return response.data.data;
    },
    enabled: !!id,
  });
}

const defaultStats: DisputeStats = {
  total: 0,
  by_status: {},
  by_category: {},
  by_priority: {},
  avg_resolution_hours: 0,
  overdue_count: 0,
};

export function useDisputeStats(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ['admin', 'disputes', 'stats', dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);

      const response = await api.get<DisputeStatsResponse>(`/admin/disputes/stats?${params.toString()}`);
      const raw = response.data;
      const stats = raw?.data && typeof raw.data === 'object' && 'total' in raw.data
        ? raw.data
        : defaultStats;
      return { success: true, data: stats } as DisputeStatsResponse;
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useDisputeMessages(disputeId: string) {
  return useQuery({
    queryKey: ['admin', 'dispute-messages', disputeId],
    queryFn: async () => {
      const response = await api.get<DisputeMessagesResponse>(`/admin/disputes/${disputeId}/messages`);
      return response.data.data;
    },
    enabled: !!disputeId,
    refetchInterval: 15000,
  });
}

export function useAssignDispute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, admin_id }: { id: string; admin_id: string }) => {
      const response = await api.patch<DisputeResponse>(`/admin/disputes/${id}/assign`, { admin_id });
      return response.data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'disputes'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dispute', variables.id] });
    },
  });
}

export function useEscalateDispute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const response = await api.patch<DisputeResponse>(`/admin/disputes/${id}/escalate`, { reason });
      return response.data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'disputes'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dispute', variables.id] });
    },
  });
}

export function useResolveDispute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      resolution_type,
      resolution_amount,
      resolution_notes,
    }: {
      id: string;
      resolution_type: DisputeResolutionType;
      resolution_amount?: number;
      resolution_notes?: string;
    }) => {
      const response = await api.patch<DisputeResponse>(`/admin/disputes/${id}/resolve`, {
        resolution_type,
        resolution_amount,
        resolution_notes,
      });
      return response.data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'disputes'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dispute', variables.id] });
    },
  });
}

export function useCloseDispute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const response = await api.patch<DisputeResponse>(`/admin/disputes/${id}/close`, { reason });
      return response.data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'disputes'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dispute', variables.id] });
    },
  });
}

export function useAddDisputeMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      disputeId,
      message,
      is_internal,
    }: {
      disputeId: string;
      message: string;
      is_internal?: boolean;
    }) => {
      const response = await api.post(`/admin/disputes/${disputeId}/messages`, {
        message,
        is_internal: is_internal || false,
      });
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'dispute-messages', variables.disputeId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dispute', variables.disputeId] });
    },
  });
}

export function useAutoEscalateDisputes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.post('/admin/disputes/auto-escalate');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'disputes'] });
    },
  });
}

export const DISPUTE_STATUS_LABELS: Record<DisputeStatus, string> = {
  open: 'Open',
  vendor_response: 'Vendor Responded',
  customer_reply: 'Customer Reply',
  under_review: 'Under Review',
  escalated: 'Escalated',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const DISPUTE_STATUS_COLORS: Record<DisputeStatus, string> = {
  open: 'bg-blue-100 text-blue-800',
  vendor_response: 'bg-yellow-100 text-yellow-800',
  customer_reply: 'bg-orange-100 text-orange-800',
  under_review: 'bg-purple-100 text-purple-800',
  escalated: 'bg-red-100 text-red-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
};

export const DISPUTE_CATEGORY_LABELS: Record<DisputeCategory, string> = {
  order_not_received: 'Order Not Received',
  item_missing: 'Missing Item',
  wrong_item: 'Wrong Item',
  damaged_item: 'Damaged Item',
  quality_issue: 'Quality Issue',
  overcharged: 'Overcharged',
  late_delivery: 'Late Delivery',
  vendor_behavior: 'Vendor Behavior',
  delivery_behavior: 'Delivery Behavior',
  unauthorized_charge: 'Unauthorized Charge',
  other: 'Other',
};

export const DISPUTE_PRIORITY_LABELS: Record<DisputePriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export const DISPUTE_PRIORITY_COLORS: Record<DisputePriority, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

export const DISPUTE_RESOLUTION_LABELS: Record<DisputeResolutionType, string> = {
  refund: 'Full Refund',
  partial_refund: 'Partial Refund',
  replacement: 'Replacement',
  store_credit: 'Store Credit',
  no_action: 'No Action',
  warning_issued: 'Warning Issued',
};
