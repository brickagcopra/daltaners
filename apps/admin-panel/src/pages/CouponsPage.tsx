import { useState } from 'react';
import {
  useAllCoupons,
  useCreateCoupon,
  useUpdateCoupon,
  useDeleteCoupon,
  type Coupon,
  type CreateCouponPayload,
} from '@/hooks/useCoupons';
import { SearchInput } from '@/components/common/SearchInput';
import { Pagination } from '@/components/common/Pagination';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { DataTable, type Column } from '@/components/common/DataTable';

const discountTypeOptions = [
  { value: '', label: 'All Types' },
  { value: 'percentage', label: 'Percentage' },
  { value: 'fixed_amount', label: 'Fixed Amount' },
  { value: 'free_delivery', label: 'Free Delivery' },
];

const activeOptions = [
  { value: '', label: 'All Status' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

const expiredOptions = [
  { value: '', label: 'All Validity' },
  { value: 'true', label: 'Expired' },
  { value: 'false', label: 'Valid' },
];

const discountTypeLabel: Record<string, string> = {
  percentage: 'Percentage',
  fixed_amount: 'Fixed Amount',
  free_delivery: 'Free Delivery',
};

const discountTypeBadge: Record<string, 'info' | 'success' | 'warning'> = {
  percentage: 'info',
  fixed_amount: 'success',
  free_delivery: 'warning',
};

function formatDiscount(coupon: Coupon): string {
  if (coupon.discount_type === 'percentage') return `${coupon.discount_value}%`;
  if (coupon.discount_type === 'fixed_amount') return `P${coupon.discount_value.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  return 'Free Delivery';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isExpired(coupon: Coupon): boolean {
  return new Date(coupon.valid_until) < new Date();
}

const emptyForm: CreateCouponPayload = {
  code: '',
  name: '',
  description: '',
  discount_type: 'percentage',
  discount_value: 0,
  minimum_order_value: 0,
  maximum_discount: undefined,
  usage_limit: undefined,
  per_user_limit: 1,
  is_first_order_only: false,
  valid_from: new Date().toISOString().split('T')[0],
  valid_until: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
};

export function CouponsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [discountType, setDiscountType] = useState('');
  const [isActive, setIsActive] = useState('');
  const [isExpiredFilter, setIsExpiredFilter] = useState('');

  // Modal state
  const [showForm, setShowForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [form, setForm] = useState<CreateCouponPayload>(emptyForm);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formError, setFormError] = useState('');

  // Delete state
  const [deletingCoupon, setDeletingCoupon] = useState<Coupon | null>(null);

  const { data, isLoading } = useAllCoupons({
    page,
    limit: 20,
    search,
    discount_type: discountType,
    is_active: isActive,
    is_expired: isExpiredFilter,
  });

  const createMutation = useCreateCoupon();
  const updateMutation = useUpdateCoupon();
  const deleteMutation = useDeleteCoupon();

  const openCreate = () => {
    setEditingCoupon(null);
    setForm(emptyForm);
    setFormIsActive(true);
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setForm({
      code: coupon.code,
      name: coupon.name,
      description: coupon.description || '',
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      minimum_order_value: coupon.minimum_order_value,
      maximum_discount: coupon.maximum_discount ?? undefined,
      usage_limit: coupon.usage_limit ?? undefined,
      per_user_limit: coupon.per_user_limit,
      is_first_order_only: coupon.is_first_order_only,
      valid_from: coupon.valid_from.split('T')[0],
      valid_until: coupon.valid_until.split('T')[0],
    });
    setFormIsActive(coupon.is_active);
    setFormError('');
    setShowForm(true);
  };

  const handleSubmit = async () => {
    setFormError('');
    if (!form.code.trim() || !form.name.trim()) {
      setFormError('Code and name are required.');
      return;
    }
    if (form.discount_type !== 'free_delivery' && form.discount_value <= 0) {
      setFormError('Discount value must be greater than 0.');
      return;
    }

    const payload = {
      ...form,
      code: form.code.toUpperCase().trim(),
      valid_from: new Date(form.valid_from).toISOString(),
      valid_until: new Date(form.valid_until).toISOString(),
    };

    try {
      if (editingCoupon) {
        await updateMutation.mutateAsync({
          id: editingCoupon.id,
          ...payload,
          is_active: formIsActive,
        });
      } else {
        await createMutation.mutateAsync(payload);
      }
      setShowForm(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save coupon';
      setFormError(msg);
    }
  };

  const handleDelete = async () => {
    if (!deletingCoupon) return;
    try {
      await deleteMutation.mutateAsync(deletingCoupon.id);
      setDeletingCoupon(null);
    } catch {
      // ignore
    }
  };

  const updateField = <K extends keyof CreateCouponPayload>(key: K, value: CreateCouponPayload[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const columns: Column<Coupon>[] = [
    {
      key: 'code',
      header: 'Code',
      render: (c) => (
        <span className="text-sm font-mono font-semibold text-foreground">{c.code}</span>
      ),
    },
    {
      key: 'name',
      header: 'Name',
      render: (c) => <span className="text-sm text-foreground">{c.name}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      render: (c) => (
        <Badge variant={discountTypeBadge[c.discount_type] || 'muted'}>
          {discountTypeLabel[c.discount_type]}
        </Badge>
      ),
    },
    {
      key: 'discount',
      header: 'Discount',
      render: (c) => (
        <span className="text-sm font-semibold text-foreground">{formatDiscount(c)}</span>
      ),
    },
    {
      key: 'usage',
      header: 'Usage',
      render: (c) => (
        <span className="text-sm text-muted-foreground">
          {c.usage_count}{c.usage_limit ? ` / ${c.usage_limit}` : ' / Unlimited'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (c) => {
        if (!c.is_active) return <Badge variant="muted">Inactive</Badge>;
        if (isExpired(c)) return <Badge variant="destructive">Expired</Badge>;
        return <Badge variant="success">Active</Badge>;
      },
    },
    {
      key: 'validity',
      header: 'Valid Period',
      render: (c) => (
        <span className="text-xs text-muted-foreground">
          {formatDate(c.valid_from)} - {formatDate(c.valid_until)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (c) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openEdit(c)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Edit"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => setDeletingCoupon(c)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-destructive transition-colors"
            title="Delete"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      ),
    },
  ];

  const totalPages = data?.meta ? Math.ceil(data.meta.total / data.meta.limit) : 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coupons & Promotions</h1>
          <p className="mt-1 text-sm text-gray-500">Create and manage discount coupons</p>
        </div>
        <Button onClick={openCreate}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Coupon
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-72">
          <SearchInput
            value={search}
            onChange={(val) => { setSearch(val); setPage(1); }}
            placeholder="Search code or name..."
          />
        </div>
        <div className="w-40">
          <Select
            options={discountTypeOptions}
            value={discountType}
            onChange={(e) => { setDiscountType(e.target.value); setPage(1); }}
          />
        </div>
        <div className="w-36">
          <Select
            options={activeOptions}
            value={isActive}
            onChange={(e) => { setIsActive(e.target.value); setPage(1); }}
          />
        </div>
        <div className="w-36">
          <Select
            options={expiredOptions}
            value={isExpiredFilter}
            onChange={(e) => { setIsExpiredFilter(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <DataTable
          columns={columns}
          data={Array.isArray(data?.data) ? data.data : []}
          isLoading={isLoading}
          keyExtractor={(c) => c.id}
          emptyTitle="No coupons found"
          emptyDescription="Create your first coupon to get started."
        />
        {data?.meta && (
          <Pagination
            page={data.meta.page}
            totalPages={totalPages}
            total={data.meta.total}
            limit={data.meta.limit}
            onPageChange={setPage}
          />
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editingCoupon ? 'Edit Coupon' : 'Create Coupon'}
        description={editingCoupon ? 'Update coupon details' : 'Create a new discount coupon'}
        size="lg"
      >
        <div className="space-y-5">
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Coupon Code"
              value={form.code}
              onChange={(e) => updateField('code', e.target.value.toUpperCase())}
              placeholder="e.g. WELCOME50"
              hint="Uppercase letters, numbers, underscores"
            />
            <Input
              label="Display Name"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="e.g. Welcome Discount"
            />
          </div>

          <Input
            label="Description (optional)"
            value={form.description || ''}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="Brief description of this coupon"
          />

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Discount Type</label>
              <select
                className="flex h-10 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={form.discount_type}
                onChange={(e) => updateField('discount_type', e.target.value as CreateCouponPayload['discount_type'])}
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed_amount">Fixed Amount (P)</option>
                <option value="free_delivery">Free Delivery</option>
              </select>
            </div>
            {form.discount_type !== 'free_delivery' && (
              <Input
                label={form.discount_type === 'percentage' ? 'Discount (%)' : 'Discount (PHP)'}
                type="number"
                min={0}
                step={form.discount_type === 'percentage' ? 1 : 0.01}
                value={form.discount_value}
                onChange={(e) => updateField('discount_value', Number(e.target.value))}
              />
            )}
            {form.discount_type === 'percentage' && (
              <Input
                label="Max Discount (PHP)"
                type="number"
                min={0}
                step={0.01}
                value={form.maximum_discount ?? ''}
                onChange={(e) => updateField('maximum_discount', e.target.value ? Number(e.target.value) : undefined)}
                hint="Cap for percentage discounts"
              />
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Min Order Value (PHP)"
              type="number"
              min={0}
              step={0.01}
              value={form.minimum_order_value ?? 0}
              onChange={(e) => updateField('minimum_order_value', Number(e.target.value))}
            />
            <Input
              label="Total Usage Limit"
              type="number"
              min={1}
              value={form.usage_limit ?? ''}
              onChange={(e) => updateField('usage_limit', e.target.value ? Number(e.target.value) : undefined)}
              hint="Leave empty for unlimited"
            />
            <Input
              label="Per-User Limit"
              type="number"
              min={1}
              value={form.per_user_limit ?? 1}
              onChange={(e) => updateField('per_user_limit', Number(e.target.value))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Valid From"
              type="date"
              value={form.valid_from.split('T')[0]}
              onChange={(e) => updateField('valid_from', e.target.value)}
            />
            <Input
              label="Valid Until"
              type="date"
              value={form.valid_until.split('T')[0]}
              onChange={(e) => updateField('valid_until', e.target.value)}
            />
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_first_order_only}
                onChange={(e) => updateField('is_first_order_only', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              First order only
            </label>
            {editingCoupon && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                Active
              </label>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {editingCoupon ? 'Save Changes' : 'Create Coupon'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingCoupon}
        onClose={() => setDeletingCoupon(null)}
        title="Delete Coupon"
        description="This action cannot be undone."
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete coupon{' '}
            <span className="font-mono font-semibold text-foreground">{deletingCoupon?.code}</span>?
            {deletingCoupon && deletingCoupon.usage_count > 0 && (
              <span className="block mt-1 text-amber-600">
                This coupon has been used {deletingCoupon.usage_count} time(s). It will be deactivated instead of permanently deleted.
              </span>
            )}
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeletingCoupon(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              loading={deleteMutation.isPending}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
