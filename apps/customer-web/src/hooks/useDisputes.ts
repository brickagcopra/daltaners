import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

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

export type DisputeStatus =
  | 'open'
  | 'vendor_response'
  | 'customer_reply'
  | 'under_review'
  | 'escalated'
  | 'resolved'
  | 'closed';

export type DisputePriority = 'low' | 'medium' | 'high' | 'urgent';

export type DisputeRequestedResolution =
  | 'refund'
  | 'partial_refund'
  | 'replacement'
  | 'store_credit'
  | 'apology'
  | 'other';

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
  requested_resolution: DisputeRequestedResolution;
  resolution_type: string | null;
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

interface MessagesResponse {
  success: boolean;
  data: DisputeMessage[];
}

interface MessageResponse {
  success: boolean;
  data: DisputeMessage;
}

export interface CreateDisputePayload {
  order_id: string;
  return_request_id?: string;
  category: DisputeCategory;
  subject: string;
  description: string;
  evidence_urls?: string[];
  requested_resolution?: DisputeRequestedResolution;
}

export interface DisputeFilters {
  page?: number;
  limit?: number;
  status?: DisputeStatus;
  category?: DisputeCategory;
  priority?: DisputePriority;
  date_from?: string;
  date_to?: string;
}

export function useMyDisputes(filters: DisputeFilters = {}) {
  const { page = 1, limit = 10, status, category, priority, date_from, date_to } = filters;

  return useQuery({
    queryKey: ['my-disputes', { page, limit, status, category, priority, date_from, date_to }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (status) params.set('status', status);
      if (category) params.set('category', category);
      if (priority) params.set('priority', priority);
      if (date_from) params.set('date_from', date_from);
      if (date_to) params.set('date_to', date_to);

      const { data } = await api.get<DisputesResponse>(`/disputes/my?${params.toString()}`);
      return data;
    },
  });
}

export function useDispute(id: string) {
  return useQuery({
    queryKey: ['dispute', id],
    queryFn: async () => {
      const { data } = await api.get<DisputeResponse>(`/disputes/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useDisputeMessages(id: string) {
  return useQuery({
    queryKey: ['dispute-messages', id],
    queryFn: async () => {
      const { data } = await api.get<MessagesResponse>(`/disputes/${id}/messages`);
      return data.data;
    },
    enabled: !!id,
    refetchInterval: 15000,
  });
}

export function useCreateDispute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateDisputePayload) => {
      const { data } = await api.post<DisputeResponse>('/disputes', payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-disputes'] });
    },
  });
}

export function useAddDisputeMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ disputeId, message, attachments }: { disputeId: string; message: string; attachments?: string[] }) => {
      const { data } = await api.post<MessageResponse>(`/disputes/${disputeId}/messages`, {
        message,
        attachments,
      });
      return data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dispute', variables.disputeId] });
      queryClient.invalidateQueries({ queryKey: ['dispute-messages', variables.disputeId] });
    },
  });
}

export function useEscalateDispute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, escalation_reason }: { id: string; escalation_reason?: string }) => {
      const { data } = await api.patch<DisputeResponse>(`/disputes/${id}/escalate`, {
        escalation_reason,
      });
      return data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dispute', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['my-disputes'] });
    },
  });
}

export const DISPUTE_STATUS_LABELS: Record<DisputeStatus, string> = {
  open: 'Open',
  vendor_response: 'Vendor Responded',
  customer_reply: 'Awaiting Response',
  under_review: 'Under Review',
  escalated: 'Escalated',
  resolved: 'Resolved',
  closed: 'Closed',
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

export const DISPUTE_RESOLUTION_LABELS: Record<DisputeRequestedResolution, string> = {
  refund: 'Full Refund',
  partial_refund: 'Partial Refund',
  replacement: 'Replacement',
  store_credit: 'Store Credit',
  apology: 'Apology',
  other: 'Other',
};
