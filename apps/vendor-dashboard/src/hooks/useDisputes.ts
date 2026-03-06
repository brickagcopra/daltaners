import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiResponse } from '@/lib/api';

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

export interface DisputeMessage {
  id: string;
  disputeId: string;
  senderId: string;
  senderRole: 'customer' | 'vendor_owner' | 'vendor_staff' | 'admin';
  message: string;
  attachments: string[];
  isInternal: boolean;
  createdAt: string;
}

export interface Dispute {
  id: string;
  disputeNumber: string;
  orderId: string;
  returnRequestId: string | null;
  customerId: string;
  storeId: string;
  category: DisputeCategory;
  status: DisputeStatus;
  priority: DisputePriority;
  subject: string;
  description: string;
  evidenceUrls: string[];
  requestedResolution: string;
  resolutionType: string | null;
  resolutionAmount: number;
  resolutionNotes: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  escalatedAt: string | null;
  escalationReason: string | null;
  vendorResponseDeadline: string | null;
  adminAssignedTo: string | null;
  messages: DisputeMessage[];
  createdAt: string;
  updatedAt: string;
}

interface DisputeListResponse {
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

export interface VendorDisputeFilters {
  page?: number;
  limit?: number;
  status?: DisputeStatus;
  category?: DisputeCategory;
  priority?: DisputePriority;
}

// Transform snake_case API response to camelCase
function transformDispute(d: Record<string, unknown>): Dispute {
  const messages = ((d.messages as Record<string, unknown>[]) || []).map((m) => ({
    id: m.id as string,
    disputeId: (m.dispute_id as string) || '',
    senderId: (m.sender_id as string) || '',
    senderRole: (m.sender_role as DisputeMessage['senderRole']) || 'customer',
    message: (m.message as string) || '',
    attachments: (m.attachments as string[]) || [],
    isInternal: (m.is_internal as boolean) || false,
    createdAt: (m.created_at as string) || '',
  }));

  return {
    id: d.id as string,
    disputeNumber: (d.dispute_number as string) || '',
    orderId: (d.order_id as string) || '',
    returnRequestId: (d.return_request_id as string) || null,
    customerId: (d.customer_id as string) || '',
    storeId: (d.store_id as string) || '',
    category: (d.category as DisputeCategory) || 'other',
    status: (d.status as DisputeStatus) || 'open',
    priority: (d.priority as DisputePriority) || 'medium',
    subject: (d.subject as string) || '',
    description: (d.description as string) || '',
    evidenceUrls: (d.evidence_urls as string[]) || [],
    requestedResolution: (d.requested_resolution as string) || 'refund',
    resolutionType: (d.resolution_type as string) || null,
    resolutionAmount: (d.resolution_amount as number) || 0,
    resolutionNotes: (d.resolution_notes as string) || null,
    resolvedBy: (d.resolved_by as string) || null,
    resolvedAt: (d.resolved_at as string) || null,
    escalatedAt: (d.escalated_at as string) || null,
    escalationReason: (d.escalation_reason as string) || null,
    vendorResponseDeadline: (d.vendor_response_deadline as string) || null,
    adminAssignedTo: (d.admin_assigned_to as string) || null,
    messages,
    createdAt: (d.created_at as string) || '',
    updatedAt: (d.updated_at as string) || '',
  };
}

export function useVendorDisputes(filters: VendorDisputeFilters = {}) {
  const { page = 1, limit = 20, status, category, priority } = filters;

  return useQuery({
    queryKey: ['vendor-disputes', { page, limit, status, category, priority }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (status) params.set('status', status);
      if (category) params.set('category', category);
      if (priority) params.set('priority', priority);

      const { data } = await api.get<ApiResponse>(`/vendor/disputes?${params.toString()}`);
      const raw = data as unknown as DisputeListResponse;
      return {
        ...raw,
        data: raw.data.map((d) => transformDispute(d as unknown as Record<string, unknown>)),
      };
    },
    refetchInterval: 30000,
  });
}

export function useVendorDispute(disputeId: string) {
  return useQuery({
    queryKey: ['vendor-dispute', disputeId],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse>(`/vendor/disputes/${disputeId}`);
      const raw = (data as Record<string, unknown>).data as Record<string, unknown>;
      return transformDispute(raw);
    },
    enabled: !!disputeId,
  });
}

export function useVendorDisputeMessages(disputeId: string) {
  return useQuery({
    queryKey: ['vendor-dispute-messages', disputeId],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse>(`/vendor/disputes/${disputeId}/messages`);
      const raw = (data as Record<string, unknown>).data as Record<string, unknown>[];
      return raw.map((m) => ({
        id: m.id as string,
        disputeId: (m.dispute_id as string) || '',
        senderId: (m.sender_id as string) || '',
        senderRole: (m.sender_role as DisputeMessage['senderRole']) || 'customer',
        message: (m.message as string) || '',
        attachments: (m.attachments as string[]) || [],
        isInternal: (m.is_internal as boolean) || false,
        createdAt: (m.created_at as string) || '',
      }));
    },
    enabled: !!disputeId,
    refetchInterval: 15000,
  });
}

export function useRespondToDispute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ disputeId, message }: { disputeId: string; message: string }) => {
      const { data } = await api.post(`/vendor/disputes/${disputeId}/respond`, { message });
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vendor-dispute', variables.disputeId] });
      queryClient.invalidateQueries({ queryKey: ['vendor-dispute-messages', variables.disputeId] });
      queryClient.invalidateQueries({ queryKey: ['vendor-disputes'] });
    },
  });
}

export const DISPUTE_STATUS_LABELS: Record<DisputeStatus, string> = {
  open: 'Open',
  vendor_response: 'Responded',
  customer_reply: 'Customer Reply',
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
