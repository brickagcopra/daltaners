import { useState } from 'react';
import {
  useVendorCoupons,
  useCreateVendorCoupon,
  useUpdateVendorCoupon,
  useDeleteVendorCoupon,
  type Coupon,
  type CouponFilters,
  type CreateCouponPayload,
  type DiscountType,
} from '@/hooks/useCoupons';
const discountTypeLabels: Record<DiscountType, string> = {
  percentage: 'Percentage',
  fixed_amount: 'Fixed Amount',
  free_delivery: 'Free Delivery',
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function isExpired(dateStr: string): boolean {
  return new Date(dateStr) < new Date();
}

interface CouponFormData {
  code: string;
  name: string;
  description: string;
  discount_type: DiscountType;
  discount_value: number;
  minimum_order_value: number;
  maximum_discount: number | '';
  usage_limit: number | '';
  per_user_limit: number;
  is_first_order_only: boolean;
  valid_from: string;
  valid_until: string;
}

const defaultForm: CouponFormData = {
  code: '',
  name: '',
  description: '',
  discount_type: 'percentage',
  discount_value: 0,
  minimum_order_value: 0,
  maximum_discount: '',
  usage_limit: '',
  per_user_limit: 1,
  is_first_order_only: false,
  valid_from: '',
  valid_until: '',
};

export function PromotionsPage() {
  const [filters, setFilters] = useState<CouponFilters>({ page: 1, limit: 10 });
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<CouponFormData>(defaultForm);
  const [search, setSearch] = useState('');

  const { data: couponsResp, isLoading } = useVendorCoupons(filters);
  const createMutation = useCreateVendorCoupon();
  const updateMutation = useUpdateVendorCoupon();
  const deleteMutation = useDeleteVendorCoupon();

  const coupons = (couponsResp?.data ?? []) as Coupon[];
  const meta = couponsResp?.meta;

  const handleOpenCreate = () => {
    setEditingCoupon(null);
    setForm(defaultForm);
    setShowModal(true);
  };

  const handleOpenEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setForm({
      code: coupon.code,
      name: coupon.name,
      description: coupon.description || '',
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      minimum_order_value: coupon.minimum_order_value,
      maximum_discount: coupon.maximum_discount ?? '',
      usage_limit: coupon.usage_limit ?? '',
      per_user_limit: coupon.per_user_limit,
      is_first_order_only: coupon.is_first_order_only,
      valid_from: coupon.valid_from.split('T')[0],
      valid_until: coupon.valid_until.split('T')[0],
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: CreateCouponPayload = {
      code: form.code,
      name: form.name,
      description: form.description || undefined,
      discount_type: form.discount_type,
      discount_value: form.discount_value,
      minimum_order_value: form.minimum_order_value || undefined,
      maximum_discount: form.maximum_discount ? Number(form.maximum_discount) : undefined,
      usage_limit: form.usage_limit ? Number(form.usage_limit) : undefined,
      per_user_limit: form.per_user_limit,
      is_first_order_only: form.is_first_order_only,
      valid_from: new Date(form.valid_from).toISOString(),
      valid_until: new Date(form.valid_until + 'T23:59:59').toISOString(),
    };

    if (editingCoupon) {
      await updateMutation.mutateAsync({ id: editingCoupon.id, ...payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    setShowModal(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteMutation.mutateAsync(deleteId);
    setDeleteId(null);
  };

  const handleSearch = () => {
    setFilters({ ...filters, search: search || undefined, page: 1 });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Promotions</h1>
          <p className="mt-1 text-sm text-gray-500">Create and manage coupons for your store.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
        >
          + Create Coupon
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search coupons..."
            className="rounded-l-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <button
            onClick={handleSearch}
            className="rounded-r-lg border border-l-0 border-gray-300 bg-gray-50 px-3 py-2 text-sm hover:bg-gray-100"
          >
            Search
          </button>
        </div>

        <select
          value={filters.discount_type || ''}
          onChange={(e) => setFilters({ ...filters, discount_type: e.target.value || undefined, page: 1 })}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All Types</option>
          <option value="percentage">Percentage</option>
          <option value="fixed_amount">Fixed Amount</option>
          <option value="free_delivery">Free Delivery</option>
        </select>

        <select
          value={filters.is_active !== undefined ? String(filters.is_active) : ''}
          onChange={(e) => {
            const val = e.target.value;
            setFilters({
              ...filters,
              is_active: val === '' ? undefined : val === 'true',
              page: 1,
            });
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      {/* Coupons Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Code</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Value</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Usage</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Valid Period</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 w-20 animate-pulse rounded bg-gray-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-500">
                    No coupons found. Create your first coupon!
                  </td>
                </tr>
              ) : (
                coupons.map((coupon) => (
                  <tr key={coupon.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-mono font-semibold text-primary-600">
                      {coupon.code}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{coupon.name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {discountTypeLabels[coupon.discount_type]}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                      {coupon.discount_type === 'percentage'
                        ? `${coupon.discount_value}%`
                        : coupon.discount_type === 'fixed_amount'
                          ? formatCurrency(coupon.discount_value)
                          : 'Free'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {coupon.usage_count}/{coupon.usage_limit ?? '∞'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {formatDate(coupon.valid_from)} — {formatDate(coupon.valid_until)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {!coupon.is_active ? (
                        <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                          Inactive
                        </span>
                      ) : isExpired(coupon.valid_until) ? (
                        <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                          Expired
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenEdit(coupon)}
                          className="text-primary-600 hover:text-primary-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteId(coupon.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {meta && (meta.totalPages ?? 0) > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
            <p className="text-sm text-gray-500">
              Page {meta.page} of {meta.totalPages ?? 1} ({meta.total} total)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setFilters({ ...filters, page: (filters.page ?? 1) - 1 })}
                disabled={(filters.page ?? 1) <= 1}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setFilters({ ...filters, page: (filters.page ?? 1) + 1 })}
                disabled={(filters.page ?? 1) >= (meta.totalPages ?? 1)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900">
              {editingCoupon ? 'Edit Coupon' : 'Create Coupon'}
            </h2>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Code</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    required
                    pattern="[A-Z0-9_]+"
                    maxLength={50}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    required
                    maxLength={255}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Discount Type</label>
                  <select
                    value={form.discount_type}
                    onChange={(e) => setForm({ ...form, discount_type: e.target.value as DiscountType })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed_amount">Fixed Amount (PHP)</option>
                    <option value="free_delivery">Free Delivery</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {form.discount_type === 'percentage' ? 'Discount (%)' : 'Discount Amount'}
                  </label>
                  <input
                    type="number"
                    value={form.discount_value}
                    onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    min={0}
                    step={form.discount_type === 'percentage' ? 1 : 0.01}
                    required
                    disabled={form.discount_type === 'free_delivery'}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Min Order</label>
                  <input
                    type="number"
                    value={form.minimum_order_value}
                    onChange={(e) => setForm({ ...form, minimum_order_value: Number(e.target.value) })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    min={0}
                    step={0.01}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Max Discount</label>
                  <input
                    type="number"
                    value={form.maximum_discount}
                    onChange={(e) => setForm({ ...form, maximum_discount: e.target.value ? Number(e.target.value) : '' })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    min={0}
                    step={0.01}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Usage Limit</label>
                  <input
                    type="number"
                    value={form.usage_limit}
                    onChange={(e) => setForm({ ...form, usage_limit: e.target.value ? Number(e.target.value) : '' })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    min={1}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Valid From</label>
                  <input
                    type="date"
                    value={form.valid_from}
                    onChange={(e) => setForm({ ...form, valid_from: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Valid Until</label>
                  <input
                    type="date"
                    value={form.valid_until}
                    onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Per-User Limit</label>
                  <input
                    type="number"
                    value={form.per_user_limit}
                    onChange={(e) => setForm({ ...form, per_user_limit: Number(e.target.value) })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    min={1}
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={form.is_first_order_only}
                      onChange={(e) => setForm({ ...form, is_first_order_only: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    First order only
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Saving...'
                    : editingCoupon
                      ? 'Update'
                      : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900">Delete Coupon</h2>
            <p className="mt-2 text-sm text-gray-500">
              Are you sure you want to delete this coupon? This action cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
