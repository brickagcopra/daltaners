import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// Types matching the mock data
export interface GeneralSettings {
  platform_name: string;
  platform_description: string;
  support_email: string;
  support_phone: string;
  logo_url: string;
  favicon_url: string;
  primary_color: string;
  secondary_color: string;
  default_locale: string;
  supported_locales: string[];
  timezone: string;
  currency: string;
  currency_symbol: string;
  maintenance_mode: boolean;
  maintenance_message: string;
}

export interface CommerceSettings {
  default_commission_rate: number;
  grocery_commission_rate: number;
  food_commission_rate: number;
  pharmacy_commission_rate: number;
  electronics_commission_rate: number;
  grocery_min_order: number;
  food_min_order: number;
  pharmacy_min_order: number;
  parcel_min_order: number;
  free_delivery_threshold: number;
  standard_delivery_fee: number;
  express_delivery_fee: number;
  scheduled_delivery_fee: number;
  max_concurrent_orders_per_rider: number;
  order_modification_window_minutes: number;
  max_scheduled_days_ahead: number;
  auto_cancel_unpaid_minutes: number;
  vendor_settlement_cycle: string;
  vendor_settlement_day: number;
}

export interface PaymentSettings {
  enabled_methods: string[];
  stripe_enabled: boolean;
  gcash_enabled: boolean;
  maya_enabled: boolean;
  grabpay_enabled: boolean;
  cod_enabled: boolean;
  wallet_enabled: boolean;
  bank_transfer_enabled: boolean;
  cod_max_amount: number;
  wallet_daily_limit: number;
  wallet_monthly_limit: number;
  refund_auto_approve_max: number;
  refund_approval_required_above: number;
}

export interface SecuritySettings {
  password_min_length: number;
  password_require_uppercase: boolean;
  password_require_number: boolean;
  password_require_special: boolean;
  max_login_attempts: number;
  lockout_duration_minutes: number;
  session_timeout_minutes: number;
  mfa_required_for_admin: boolean;
  mfa_required_for_vendor: boolean;
  rate_limit_customer: number;
  rate_limit_vendor: number;
  rate_limit_admin: number;
  rate_limit_public_api: number;
  jwt_access_ttl_minutes: number;
  jwt_refresh_ttl_days: number;
  ip_whitelist_enabled: boolean;
  ip_whitelist: string[];
}

export interface NotificationSettings {
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  whatsapp_enabled: boolean;
  email_provider: string;
  sms_provider: string;
  push_provider: string;
  order_confirmation_email: boolean;
  order_confirmation_sms: boolean;
  order_confirmation_push: boolean;
  delivery_update_push: boolean;
  promotional_email: boolean;
  promotional_push: boolean;
  vendor_new_order_push: boolean;
  vendor_new_order_sms: boolean;
  low_stock_alert_email: boolean;
  daily_summary_email: boolean;
}

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  category: string;
  updated_at: string;
  updated_by: string;
}

export interface PlatformSettings {
  general: GeneralSettings;
  commerce: CommerceSettings;
  payments: PaymentSettings;
  security: SecuritySettings;
  notifications: NotificationSettings;
  feature_flags: FeatureFlag[];
}

// --- Query hooks ---

export function useAllSettings() {
  return useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: PlatformSettings }>('/admin/settings');
      return response.data;
    },
  });
}

export function useSettingsCategory<T>(category: string) {
  return useQuery({
    queryKey: ['admin', 'settings', category],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: T }>(`/admin/settings/${category}`);
      return response.data;
    },
    enabled: !!category,
  });
}

export function useFeatureFlags() {
  return useQuery({
    queryKey: ['admin', 'settings', 'feature_flags'],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: FeatureFlag[] }>('/admin/settings/feature-flags');
      return response.data;
    },
  });
}

// --- Mutation hooks ---

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ category, data }: { category: string; data: Record<string, unknown> }) => {
      const response = await api.patch(`/admin/settings/${category}`, data);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings', variables.category] });
    },
  });
}

export function useToggleFeatureFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const response = await api.patch(`/admin/settings/feature-flags/${id}`, { enabled });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'feature_flags'] });
    },
  });
}

export function useCreateFeatureFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<FeatureFlag, 'id' | 'updated_at' | 'updated_by'>) => {
      const response = await api.post('/admin/settings/feature-flags', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'feature_flags'] });
    },
  });
}

export function useDeleteFeatureFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/settings/feature-flags/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'feature_flags'] });
    },
  });
}
