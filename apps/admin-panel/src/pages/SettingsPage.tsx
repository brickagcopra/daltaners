import { useState } from 'react';
import {
  useAllSettings,
  useUpdateSettings,
  useToggleFeatureFlag,
  useCreateFeatureFlag,
  useDeleteFeatureFlag,
} from '@/hooks/useSettings';
import type {
  GeneralSettings,
  CommerceSettings,
  PaymentSettings,
  SecuritySettings,
  NotificationSettings,
} from '@/hooks/useSettings';

type SettingsTab = 'general' | 'commerce' | 'payments' | 'security' | 'notifications' | 'feature_flags';

const TABS: { key: SettingsTab; label: string }[] = [
  { key: 'general', label: 'General' },
  { key: 'commerce', label: 'Commerce' },
  { key: 'payments', label: 'Payments' },
  { key: 'security', label: 'Security' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'feature_flags', label: 'Feature Flags' },
];

const FLAG_CATEGORIES = ['all', 'services', 'channels', 'ai', 'commerce', 'marketing', 'ui', 'operations'];

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const { data: settingsData, isLoading } = useAllSettings();
  const updateMutation = useUpdateSettings();
  const toggleFlagMutation = useToggleFeatureFlag();
  const createFlagMutation = useCreateFeatureFlag();
  const deleteFlagMutation = useDeleteFeatureFlag();

  const [successMessage, setSuccessMessage] = useState('');
  const [flagCategory, setFlagCategory] = useState('all');
  const [showCreateFlag, setShowCreateFlag] = useState(false);
  const [newFlag, setNewFlag] = useState({ key: '', name: '', description: '', category: 'services', enabled: false });

  const settings = settingsData?.data;

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleSave = (category: string, data: Record<string, unknown>) => {
    updateMutation.mutate(
      { category, data },
      { onSuccess: () => showSuccess(`${category.charAt(0).toUpperCase() + category.slice(1)} settings saved successfully`) },
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Configure platform-wide settings and feature flags</p>
      </div>

      {/* Success toast */}
      {successMessage && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {successMessage}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {settings && activeTab === 'general' && (
        <GeneralSettingsPanel settings={settings.general} onSave={(d) => handleSave('general', d)} saving={updateMutation.isPending} />
      )}
      {settings && activeTab === 'commerce' && (
        <CommerceSettingsPanel settings={settings.commerce} onSave={(d) => handleSave('commerce', d)} saving={updateMutation.isPending} />
      )}
      {settings && activeTab === 'payments' && (
        <PaymentSettingsPanel settings={settings.payments} onSave={(d) => handleSave('payments', d)} saving={updateMutation.isPending} />
      )}
      {settings && activeTab === 'security' && (
        <SecuritySettingsPanel settings={settings.security} onSave={(d) => handleSave('security', d)} saving={updateMutation.isPending} />
      )}
      {settings && activeTab === 'notifications' && (
        <NotificationSettingsPanel settings={settings.notifications} onSave={(d) => handleSave('notifications', d)} saving={updateMutation.isPending} />
      )}
      {settings && activeTab === 'feature_flags' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {FLAG_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFlagCategory(cat)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    flagCategory === cat
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowCreateFlag(true)}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
            >
              Add Flag
            </button>
          </div>

          <div className="space-y-3">
            {settings.feature_flags
              .filter((f) => flagCategory === 'all' || f.category === flagCategory)
              .map((flag) => (
                <div key={flag.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{flag.name}</span>
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono text-gray-500">{flag.key}</span>
                      <span className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-600">{flag.category}</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">{flag.description}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      Updated {new Date(flag.updated_at).toLocaleDateString()} by {flag.updated_by}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleFlagMutation.mutate({ id: flag.id, enabled: !flag.enabled })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        flag.enabled ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                          flag.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Delete this feature flag?')) {
                          deleteFlagMutation.mutate(flag.id);
                        }
                      }}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
          </div>

          {/* Create Flag Modal */}
          {showCreateFlag && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                <h3 className="text-lg font-semibold text-gray-900">Create Feature Flag</h3>
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Key</label>
                    <input
                      type="text"
                      value={newFlag.key}
                      onChange={(e) => setNewFlag({ ...newFlag, key: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      placeholder="snake_case_key"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      value={newFlag.name}
                      onChange={(e) => setNewFlag({ ...newFlag, name: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      value={newFlag.description}
                      onChange={(e) => setNewFlag({ ...newFlag, description: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <select
                      value={newFlag.category}
                      onChange={(e) => setNewFlag({ ...newFlag, category: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    >
                      {FLAG_CATEGORIES.filter((c) => c !== 'all').map((cat) => (
                        <option key={cat} value={cat}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newFlag.enabled}
                      onChange={(e) => setNewFlag({ ...newFlag, enabled: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <label className="text-sm text-gray-700">Enabled by default</label>
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => setShowCreateFlag(false)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      createFlagMutation.mutate(newFlag, {
                        onSuccess: () => {
                          setShowCreateFlag(false);
                          setNewFlag({ key: '', name: '', description: '', category: 'services', enabled: false });
                          showSuccess('Feature flag created');
                        },
                      });
                    }}
                    disabled={!newFlag.key || !newFlag.name}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- Sub-panels ---

function SettingsCard({ title, children, onSave, saving }: { title: string; children: React.ReactNode; onSave: () => void; saving: boolean }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-6 py-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="space-y-4 p-6">{children}</div>
      <div className="flex justify-end border-t border-gray-200 px-6 py-4">
        <button
          onClick={onSave}
          disabled={saving}
          className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, type = 'text', hint }: { label: string; value: string | number; onChange: (v: string) => void; type?: string; hint?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

function ToggleField({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <span className="text-sm font-medium text-gray-700">{label}</span>
        {hint && <p className="text-xs text-gray-400">{hint}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-green-500' : 'bg-gray-300'
        }`}
      >
        <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );
}

function GeneralSettingsPanel({ settings, onSave, saving }: { settings: GeneralSettings; onSave: (d: Record<string, unknown>) => void; saving: boolean }) {
  const [form, setForm] = useState<GeneralSettings>({ ...settings });
  const set = (key: keyof GeneralSettings, value: unknown) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <SettingsCard title="General Settings" onSave={() => onSave(form as unknown as Record<string, unknown>)} saving={saving}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <InputField label="Platform Name" value={form.platform_name} onChange={(v) => set('platform_name', v)} />
        <InputField label="Support Email" value={form.support_email} onChange={(v) => set('support_email', v)} type="email" />
        <InputField label="Support Phone" value={form.support_phone} onChange={(v) => set('support_phone', v)} />
        <InputField label="Default Locale" value={form.default_locale} onChange={(v) => set('default_locale', v)} />
        <InputField label="Timezone" value={form.timezone} onChange={(v) => set('timezone', v)} />
        <InputField label="Currency" value={form.currency} onChange={(v) => set('currency', v)} />
        <InputField label="Currency Symbol" value={form.currency_symbol} onChange={(v) => set('currency_symbol', v)} />
        <InputField label="Primary Color" value={form.primary_color} onChange={(v) => set('primary_color', v)} hint="Hex color code" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Platform Description</label>
        <textarea
          value={form.platform_description}
          onChange={(e) => set('platform_description', e.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          rows={2}
        />
      </div>
      <ToggleField label="Maintenance Mode" checked={form.maintenance_mode} onChange={(v) => set('maintenance_mode', v)} hint="When enabled, customers see a maintenance page" />
      {form.maintenance_mode && (
        <div>
          <label className="block text-sm font-medium text-gray-700">Maintenance Message</label>
          <textarea
            value={form.maintenance_message}
            onChange={(e) => set('maintenance_message', e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            rows={2}
          />
        </div>
      )}
    </SettingsCard>
  );
}

function CommerceSettingsPanel({ settings, onSave, saving }: { settings: CommerceSettings; onSave: (d: Record<string, unknown>) => void; saving: boolean }) {
  const [form, setForm] = useState<CommerceSettings>({ ...settings });
  const set = (key: keyof CommerceSettings, value: unknown) => setForm((prev) => ({ ...prev, [key]: value }));
  const setNum = (key: keyof CommerceSettings, v: string) => set(key, v === '' ? 0 : Number(v));

  return (
    <SettingsCard title="Commerce Settings" onSave={() => onSave(form as unknown as Record<string, unknown>)} saving={saving}>
      <h4 className="text-sm font-semibold text-gray-700">Commission Rates (%)</h4>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <InputField label="Default" value={form.default_commission_rate} onChange={(v) => setNum('default_commission_rate', v)} type="number" />
        <InputField label="Grocery" value={form.grocery_commission_rate} onChange={(v) => setNum('grocery_commission_rate', v)} type="number" />
        <InputField label="Food" value={form.food_commission_rate} onChange={(v) => setNum('food_commission_rate', v)} type="number" />
        <InputField label="Pharmacy" value={form.pharmacy_commission_rate} onChange={(v) => setNum('pharmacy_commission_rate', v)} type="number" />
        <InputField label="Electronics" value={form.electronics_commission_rate} onChange={(v) => setNum('electronics_commission_rate', v)} type="number" />
      </div>
      <h4 className="mt-4 text-sm font-semibold text-gray-700">Minimum Order Values (PHP)</h4>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <InputField label="Grocery" value={form.grocery_min_order} onChange={(v) => setNum('grocery_min_order', v)} type="number" />
        <InputField label="Food" value={form.food_min_order} onChange={(v) => setNum('food_min_order', v)} type="number" />
        <InputField label="Pharmacy" value={form.pharmacy_min_order} onChange={(v) => setNum('pharmacy_min_order', v)} type="number" />
        <InputField label="Parcel" value={form.parcel_min_order} onChange={(v) => setNum('parcel_min_order', v)} type="number" />
      </div>
      <h4 className="mt-4 text-sm font-semibold text-gray-700">Delivery Fees (PHP)</h4>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <InputField label="Free Delivery Above" value={form.free_delivery_threshold} onChange={(v) => setNum('free_delivery_threshold', v)} type="number" />
        <InputField label="Standard Fee" value={form.standard_delivery_fee} onChange={(v) => setNum('standard_delivery_fee', v)} type="number" />
        <InputField label="Express Fee" value={form.express_delivery_fee} onChange={(v) => setNum('express_delivery_fee', v)} type="number" />
        <InputField label="Scheduled Fee" value={form.scheduled_delivery_fee} onChange={(v) => setNum('scheduled_delivery_fee', v)} type="number" />
      </div>
      <h4 className="mt-4 text-sm font-semibold text-gray-700">Operations</h4>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <InputField label="Max Concurrent Orders/Rider" value={form.max_concurrent_orders_per_rider} onChange={(v) => setNum('max_concurrent_orders_per_rider', v)} type="number" />
        <InputField label="Modification Window (min)" value={form.order_modification_window_minutes} onChange={(v) => setNum('order_modification_window_minutes', v)} type="number" />
        <InputField label="Schedule Ahead (days)" value={form.max_scheduled_days_ahead} onChange={(v) => setNum('max_scheduled_days_ahead', v)} type="number" />
        <InputField label="Auto-Cancel Unpaid (min)" value={form.auto_cancel_unpaid_minutes} onChange={(v) => setNum('auto_cancel_unpaid_minutes', v)} type="number" />
      </div>
    </SettingsCard>
  );
}

function PaymentSettingsPanel({ settings, onSave, saving }: { settings: PaymentSettings; onSave: (d: Record<string, unknown>) => void; saving: boolean }) {
  const [form, setForm] = useState<PaymentSettings>({ ...settings });
  const set = (key: keyof PaymentSettings, value: unknown) => setForm((prev) => ({ ...prev, [key]: value }));
  const setNum = (key: keyof PaymentSettings, v: string) => set(key, v === '' ? 0 : Number(v));

  return (
    <SettingsCard title="Payment Settings" onSave={() => onSave(form as unknown as Record<string, unknown>)} saving={saving}>
      <h4 className="text-sm font-semibold text-gray-700">Payment Methods</h4>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <ToggleField label="Stripe (Credit/Debit Card)" checked={form.stripe_enabled} onChange={(v) => set('stripe_enabled', v)} />
        <ToggleField label="GCash" checked={form.gcash_enabled} onChange={(v) => set('gcash_enabled', v)} />
        <ToggleField label="Maya / PayMaya" checked={form.maya_enabled} onChange={(v) => set('maya_enabled', v)} />
        <ToggleField label="GrabPay" checked={form.grabpay_enabled} onChange={(v) => set('grabpay_enabled', v)} />
        <ToggleField label="Cash on Delivery" checked={form.cod_enabled} onChange={(v) => set('cod_enabled', v)} />
        <ToggleField label="Daltaners Wallet" checked={form.wallet_enabled} onChange={(v) => set('wallet_enabled', v)} />
        <ToggleField label="Bank Transfer" checked={form.bank_transfer_enabled} onChange={(v) => set('bank_transfer_enabled', v)} />
      </div>
      <h4 className="mt-4 text-sm font-semibold text-gray-700">Limits (PHP)</h4>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <InputField label="COD Max Amount" value={form.cod_max_amount} onChange={(v) => setNum('cod_max_amount', v)} type="number" />
        <InputField label="Wallet Daily Limit" value={form.wallet_daily_limit} onChange={(v) => setNum('wallet_daily_limit', v)} type="number" />
        <InputField label="Wallet Monthly Limit" value={form.wallet_monthly_limit} onChange={(v) => setNum('wallet_monthly_limit', v)} type="number" />
      </div>
      <h4 className="mt-4 text-sm font-semibold text-gray-700">Refund Thresholds (PHP)</h4>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <InputField label="Auto-Approve Max" value={form.refund_auto_approve_max} onChange={(v) => setNum('refund_auto_approve_max', v)} type="number" hint="Refunds below this are auto-approved" />
        <InputField label="Approval Required Above" value={form.refund_approval_required_above} onChange={(v) => setNum('refund_approval_required_above', v)} type="number" hint="Higher-value refunds require admin approval" />
      </div>
    </SettingsCard>
  );
}

function SecuritySettingsPanel({ settings, onSave, saving }: { settings: SecuritySettings; onSave: (d: Record<string, unknown>) => void; saving: boolean }) {
  const [form, setForm] = useState<SecuritySettings>({ ...settings });
  const set = (key: keyof SecuritySettings, value: unknown) => setForm((prev) => ({ ...prev, [key]: value }));
  const setNum = (key: keyof SecuritySettings, v: string) => set(key, v === '' ? 0 : Number(v));

  return (
    <SettingsCard title="Security Settings" onSave={() => onSave(form as unknown as Record<string, unknown>)} saving={saving}>
      <h4 className="text-sm font-semibold text-gray-700">Password Policy</h4>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <InputField label="Minimum Length" value={form.password_min_length} onChange={(v) => setNum('password_min_length', v)} type="number" />
        <div />
        <ToggleField label="Require Uppercase" checked={form.password_require_uppercase} onChange={(v) => set('password_require_uppercase', v)} />
        <ToggleField label="Require Number" checked={form.password_require_number} onChange={(v) => set('password_require_number', v)} />
        <ToggleField label="Require Special Character" checked={form.password_require_special} onChange={(v) => set('password_require_special', v)} />
      </div>
      <h4 className="mt-4 text-sm font-semibold text-gray-700">Login & Session</h4>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <InputField label="Max Login Attempts" value={form.max_login_attempts} onChange={(v) => setNum('max_login_attempts', v)} type="number" />
        <InputField label="Lockout Duration (min)" value={form.lockout_duration_minutes} onChange={(v) => setNum('lockout_duration_minutes', v)} type="number" />
        <InputField label="Session Timeout (min)" value={form.session_timeout_minutes} onChange={(v) => setNum('session_timeout_minutes', v)} type="number" />
      </div>
      <h4 className="mt-4 text-sm font-semibold text-gray-700">Multi-Factor Authentication</h4>
      <div className="space-y-3">
        <ToggleField label="MFA Required for Admins" checked={form.mfa_required_for_admin} onChange={(v) => set('mfa_required_for_admin', v)} />
        <ToggleField label="MFA Required for Vendors" checked={form.mfa_required_for_vendor} onChange={(v) => set('mfa_required_for_vendor', v)} />
      </div>
      <h4 className="mt-4 text-sm font-semibold text-gray-700">Rate Limiting (req/min)</h4>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <InputField label="Customer" value={form.rate_limit_customer} onChange={(v) => setNum('rate_limit_customer', v)} type="number" />
        <InputField label="Vendor" value={form.rate_limit_vendor} onChange={(v) => setNum('rate_limit_vendor', v)} type="number" />
        <InputField label="Admin" value={form.rate_limit_admin} onChange={(v) => setNum('rate_limit_admin', v)} type="number" />
        <InputField label="Public API" value={form.rate_limit_public_api} onChange={(v) => setNum('rate_limit_public_api', v)} type="number" />
      </div>
      <h4 className="mt-4 text-sm font-semibold text-gray-700">JWT Configuration</h4>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <InputField label="Access Token TTL (min)" value={form.jwt_access_ttl_minutes} onChange={(v) => setNum('jwt_access_ttl_minutes', v)} type="number" />
        <InputField label="Refresh Token TTL (days)" value={form.jwt_refresh_ttl_days} onChange={(v) => setNum('jwt_refresh_ttl_days', v)} type="number" />
      </div>
    </SettingsCard>
  );
}

function NotificationSettingsPanel({ settings, onSave, saving }: { settings: NotificationSettings; onSave: (d: Record<string, unknown>) => void; saving: boolean }) {
  const [form, setForm] = useState<NotificationSettings>({ ...settings });
  const set = (key: keyof NotificationSettings, value: unknown) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <SettingsCard title="Notification Settings" onSave={() => onSave(form as unknown as Record<string, unknown>)} saving={saving}>
      <h4 className="text-sm font-semibold text-gray-700">Channels</h4>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <ToggleField label="Email Notifications" checked={form.email_enabled} onChange={(v) => set('email_enabled', v)} />
        <ToggleField label="SMS Notifications" checked={form.sms_enabled} onChange={(v) => set('sms_enabled', v)} />
        <ToggleField label="Push Notifications" checked={form.push_enabled} onChange={(v) => set('push_enabled', v)} />
        <ToggleField label="WhatsApp Notifications" checked={form.whatsapp_enabled} onChange={(v) => set('whatsapp_enabled', v)} />
      </div>
      <h4 className="mt-4 text-sm font-semibold text-gray-700">Customer Notifications</h4>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <ToggleField label="Order Confirmation (Email)" checked={form.order_confirmation_email} onChange={(v) => set('order_confirmation_email', v)} />
        <ToggleField label="Order Confirmation (SMS)" checked={form.order_confirmation_sms} onChange={(v) => set('order_confirmation_sms', v)} />
        <ToggleField label="Order Confirmation (Push)" checked={form.order_confirmation_push} onChange={(v) => set('order_confirmation_push', v)} />
        <ToggleField label="Delivery Updates (Push)" checked={form.delivery_update_push} onChange={(v) => set('delivery_update_push', v)} />
        <ToggleField label="Promotional (Email)" checked={form.promotional_email} onChange={(v) => set('promotional_email', v)} />
        <ToggleField label="Promotional (Push)" checked={form.promotional_push} onChange={(v) => set('promotional_push', v)} />
      </div>
      <h4 className="mt-4 text-sm font-semibold text-gray-700">Vendor Notifications</h4>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <ToggleField label="New Order (Push)" checked={form.vendor_new_order_push} onChange={(v) => set('vendor_new_order_push', v)} />
        <ToggleField label="New Order (SMS)" checked={form.vendor_new_order_sms} onChange={(v) => set('vendor_new_order_sms', v)} />
        <ToggleField label="Low Stock Alert (Email)" checked={form.low_stock_alert_email} onChange={(v) => set('low_stock_alert_email', v)} />
        <ToggleField label="Daily Summary (Email)" checked={form.daily_summary_email} onChange={(v) => set('daily_summary_email', v)} />
      </div>
    </SettingsCard>
  );
}

export default SettingsPage;
