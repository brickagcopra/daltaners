import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';

// ---------- Types ----------

export interface AuditChange {
  field: string;
  old_value: string | number | boolean | null;
  new_value: string | number | boolean | null;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  admin_user_id: string;
  admin_name: string;
  admin_email: string;
  action_type: string;
  resource_type: string;
  resource_id: string;
  resource_name: string;
  description: string;
  ip_address: string;
  user_agent: string;
  changes: AuditChange[];
  metadata: Record<string, unknown>;
}

export interface AuditLogStats {
  total_actions: number;
  actions_today: number;
  unique_admins: number;
  by_action_type: Record<string, number>;
  by_resource_type: Record<string, number>;
  most_active_admin: { name: string; action_count: number };
}

export interface AuditLogFilters {
  page?: number;
  limit?: number;
  search?: string;
  action_type?: string;
  resource_type?: string;
  admin_user_id?: string;
  date_from?: string;
  date_to?: string;
}

// ---------- Query Hooks ----------

export function useAuditLog(filters: AuditLogFilters = {}) {
  const { page = 1, limit = 20, search, action_type, resource_type, admin_user_id, date_from, date_to } = filters;
  return useQuery({
    queryKey: ['admin', 'audit-log', 'list', { page, limit, search, action_type, resource_type, admin_user_id, date_from, date_to }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (search) params.set('search', search);
      if (action_type && action_type !== 'all') params.set('action_type', action_type);
      if (resource_type && resource_type !== 'all') params.set('resource_type', resource_type);
      if (admin_user_id && admin_user_id !== 'all') params.set('admin_user_id', admin_user_id);
      if (date_from) params.set('date_from', date_from);
      if (date_to) params.set('date_to', date_to);
      const response = await api.get<{
        data: AuditLogEntry[];
        meta: { page: number; limit: number; total: number; totalPages: number };
      }>(`/admin/audit-log?${params.toString()}`);
      return response.data;
    },
  });
}

export function useAuditLogStats() {
  return useQuery({
    queryKey: ['admin', 'audit-log', 'stats'],
    queryFn: async () => {
      const response = await api.get<{ data: AuditLogStats }>('/admin/audit-log/stats');
      return response.data.data;
    },
    staleTime: 60_000,
  });
}

export function useAuditLogEntry(id: string | null) {
  return useQuery({
    queryKey: ['admin', 'audit-log', 'detail', id],
    queryFn: async () => {
      const response = await api.get<{ data: AuditLogEntry }>(`/admin/audit-log/${id}`);
      return response.data.data;
    },
    enabled: !!id,
  });
}

// ---------- Mutation Hooks ----------

export function useExportAuditLog() {
  return useMutation({
    mutationFn: async ({ format, date_from, date_to }: { format: 'csv' | 'pdf'; date_from?: string; date_to?: string }) => {
      const response = await api.post<{ data: { download_url: string; filename: string; entries_count: number } }>(
        '/admin/audit-log/export',
        { format, date_from, date_to },
      );
      return response.data.data;
    },
  });
}

// ---------- Constants ----------

export const ACTION_TYPE_LABELS: Record<string, string> = {
  user_create: 'User Created',
  user_update: 'User Updated',
  user_suspend: 'User Suspended',
  user_delete: 'User Deleted',
  vendor_approve: 'Vendor Approved',
  vendor_suspend: 'Vendor Suspended',
  vendor_reject: 'Vendor Rejected',
  vendor_update: 'Vendor Updated',
  order_cancel: 'Order Cancelled',
  order_refund: 'Order Refunded',
  order_reassign: 'Order Reassigned',
  product_approve: 'Product Approved',
  product_reject: 'Product Rejected',
  product_delete: 'Product Deleted',
  settlement_approve: 'Settlement Approved',
  settlement_process: 'Settlement Processed',
  settlement_reject: 'Settlement Rejected',
  coupon_create: 'Coupon Created',
  coupon_update: 'Coupon Updated',
  coupon_delete: 'Coupon Deleted',
  zone_create: 'Zone Created',
  zone_update: 'Zone Updated',
  zone_delete: 'Zone Deleted',
  policy_rule_create: 'Policy Rule Created',
  policy_rule_update: 'Policy Rule Updated',
  violation_create: 'Violation Created',
  violation_resolve: 'Violation Resolved',
  violation_dismiss: 'Violation Dismissed',
  appeal_approve: 'Appeal Approved',
  appeal_deny: 'Appeal Denied',
  campaign_approve: 'Campaign Approved',
  campaign_reject: 'Campaign Rejected',
  campaign_suspend: 'Campaign Suspended',
  settings_update: 'Settings Updated',
  role_create: 'Role Created',
  role_update: 'Role Updated',
  tax_config_update: 'Tax Config Updated',
  brand_verify: 'Brand Verified',
  brand_suspend: 'Brand Suspended',
};

export const ACTION_TYPE_COLORS: Record<string, string> = {
  user_create: 'bg-green-100 text-green-800',
  user_update: 'bg-blue-100 text-blue-800',
  user_suspend: 'bg-red-100 text-red-800',
  user_delete: 'bg-red-100 text-red-800',
  vendor_approve: 'bg-green-100 text-green-800',
  vendor_suspend: 'bg-red-100 text-red-800',
  vendor_reject: 'bg-red-100 text-red-800',
  vendor_update: 'bg-blue-100 text-blue-800',
  order_cancel: 'bg-orange-100 text-orange-800',
  order_refund: 'bg-purple-100 text-purple-800',
  order_reassign: 'bg-yellow-100 text-yellow-800',
  product_approve: 'bg-green-100 text-green-800',
  product_reject: 'bg-red-100 text-red-800',
  product_delete: 'bg-red-100 text-red-800',
  settlement_approve: 'bg-green-100 text-green-800',
  settlement_process: 'bg-blue-100 text-blue-800',
  settlement_reject: 'bg-red-100 text-red-800',
  coupon_create: 'bg-green-100 text-green-800',
  coupon_update: 'bg-blue-100 text-blue-800',
  coupon_delete: 'bg-red-100 text-red-800',
  zone_create: 'bg-green-100 text-green-800',
  zone_update: 'bg-blue-100 text-blue-800',
  zone_delete: 'bg-red-100 text-red-800',
  policy_rule_create: 'bg-green-100 text-green-800',
  policy_rule_update: 'bg-blue-100 text-blue-800',
  violation_create: 'bg-orange-100 text-orange-800',
  violation_resolve: 'bg-green-100 text-green-800',
  violation_dismiss: 'bg-gray-100 text-gray-800',
  appeal_approve: 'bg-green-100 text-green-800',
  appeal_deny: 'bg-red-100 text-red-800',
  campaign_approve: 'bg-green-100 text-green-800',
  campaign_reject: 'bg-red-100 text-red-800',
  campaign_suspend: 'bg-red-100 text-red-800',
  settings_update: 'bg-blue-100 text-blue-800',
  role_create: 'bg-green-100 text-green-800',
  role_update: 'bg-blue-100 text-blue-800',
  tax_config_update: 'bg-blue-100 text-blue-800',
  brand_verify: 'bg-green-100 text-green-800',
  brand_suspend: 'bg-red-100 text-red-800',
};

export const RESOURCE_TYPE_LABELS: Record<string, string> = {
  user: 'User',
  vendor: 'Vendor',
  store: 'Store',
  order: 'Order',
  product: 'Product',
  settlement: 'Settlement',
  coupon: 'Coupon',
  zone: 'Zone',
  policy_rule: 'Policy Rule',
  violation: 'Violation',
  appeal: 'Appeal',
  campaign: 'Campaign',
  settings: 'Settings',
  role: 'Role',
  tax_config: 'Tax Config',
  brand: 'Brand',
  category: 'Category',
};

export const RESOURCE_TYPE_COLORS: Record<string, string> = {
  user: 'bg-blue-100 text-blue-800',
  vendor: 'bg-purple-100 text-purple-800',
  store: 'bg-purple-100 text-purple-800',
  order: 'bg-orange-100 text-orange-800',
  product: 'bg-green-100 text-green-800',
  settlement: 'bg-yellow-100 text-yellow-800',
  coupon: 'bg-pink-100 text-pink-800',
  zone: 'bg-teal-100 text-teal-800',
  policy_rule: 'bg-indigo-100 text-indigo-800',
  violation: 'bg-red-100 text-red-800',
  appeal: 'bg-amber-100 text-amber-800',
  campaign: 'bg-cyan-100 text-cyan-800',
  settings: 'bg-gray-100 text-gray-800',
  role: 'bg-violet-100 text-violet-800',
  tax_config: 'bg-lime-100 text-lime-800',
  brand: 'bg-emerald-100 text-emerald-800',
  category: 'bg-sky-100 text-sky-800',
};
