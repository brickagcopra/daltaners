import { useState, FormEvent } from 'react';
import {
  useAdminBrands,
  useAdminBrandStats,
  useCreateBrand,
  useUpdateBrand,
  useVerifyBrand,
  useActivateBrand,
  useRejectBrand,
  useSuspendBrand,
  useDeleteBrand,
  BRAND_STATUS_LABELS,
  BRAND_STATUS_COLORS,
} from '@/hooks/useBrands';
import type { Brand } from '@/hooks/useBrands';

type ModalMode = 'create' | 'edit' | null;

export function BrandsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editBrand, setEditBrand] = useState<Brand | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Brand | null>(null);
  const [actionConfirm, setActionConfirm] = useState<{ brand: Brand; action: string } | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formLogoUrl, setFormLogoUrl] = useState('');
  const [formBannerUrl, setFormBannerUrl] = useState('');
  const [formWebsiteUrl, setFormWebsiteUrl] = useState('');
  const [formCountry, setFormCountry] = useState('');

  const { data, isLoading } = useAdminBrands({
    page,
    limit: 20,
    search: search || undefined,
    status: statusFilter || undefined,
  });
  const { data: stats } = useAdminBrandStats();

  const createMutation = useCreateBrand();
  const updateMutation = useUpdateBrand();
  const verifyMutation = useVerifyBrand();
  const activateMutation = useActivateBrand();
  const rejectMutation = useRejectBrand();
  const suspendMutation = useSuspendBrand();
  const deleteMutation = useDeleteBrand();

  const brands = Array.isArray(data?.data) ? data.data : [];
  const meta = data?.meta;

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormLogoUrl('');
    setFormBannerUrl('');
    setFormWebsiteUrl('');
    setFormCountry('');
    setEditBrand(null);
    setModalMode(null);
  };

  const openCreate = () => {
    resetForm();
    setModalMode('create');
  };

  const openEdit = (brand: Brand) => {
    setEditBrand(brand);
    setFormName(brand.name);
    setFormDescription(brand.description || '');
    setFormLogoUrl(brand.logo_url || '');
    setFormBannerUrl(brand.banner_url || '');
    setFormWebsiteUrl(brand.website_url || '');
    setFormCountry(brand.country_of_origin || '');
    setModalMode('edit');
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const payload = {
      name: formName,
      description: formDescription || undefined,
      logo_url: formLogoUrl || undefined,
      banner_url: formBannerUrl || undefined,
      website_url: formWebsiteUrl || undefined,
      country_of_origin: formCountry || undefined,
    };

    if (modalMode === 'create') {
      createMutation.mutate(payload, { onSuccess: resetForm });
    } else if (modalMode === 'edit' && editBrand) {
      updateMutation.mutate({ id: editBrand.id, ...payload }, { onSuccess: resetForm });
    }
  };

  const handleAction = () => {
    if (!actionConfirm) return;
    const { brand, action } = actionConfirm;
    const onSuccess = () => setActionConfirm(null);

    switch (action) {
      case 'verify':
        verifyMutation.mutate(brand.id, { onSuccess });
        break;
      case 'activate':
        activateMutation.mutate(brand.id, { onSuccess });
        break;
      case 'reject':
        rejectMutation.mutate(brand.id, { onSuccess });
        break;
      case 'suspend':
        suspendMutation.mutate(brand.id, { onSuccess });
        break;
    }
  };

  const handleDelete = () => {
    if (!deleteConfirm) return;
    deleteMutation.mutate(deleteConfirm.id, {
      onSuccess: () => setDeleteConfirm(null),
    });
  };

  const getAvailableActions = (brand: Brand): { label: string; action: string; color: string }[] => {
    const actions: { label: string; action: string; color: string }[] = [];
    switch (brand.status) {
      case 'pending':
        actions.push({ label: 'Verify', action: 'verify', color: 'text-blue-600' });
        actions.push({ label: 'Reject', action: 'reject', color: 'text-red-600' });
        break;
      case 'verified':
        actions.push({ label: 'Activate', action: 'activate', color: 'text-green-600' });
        actions.push({ label: 'Suspend', action: 'suspend', color: 'text-orange-600' });
        break;
      case 'active':
        actions.push({ label: 'Suspend', action: 'suspend', color: 'text-orange-600' });
        break;
      case 'suspended':
        actions.push({ label: 'Activate', action: 'activate', color: 'text-green-600' });
        break;
    }
    return actions;
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Brand Registry</h1>
          <p className="text-sm text-gray-500">Manage verified brands and brand applications</p>
        </div>
        <button
          onClick={openCreate}
          className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
        >
          + Add Brand
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: 'Total', value: stats.total, color: 'bg-gray-50 text-gray-700' },
            { label: 'Pending', value: stats.pending, color: 'bg-yellow-50 text-yellow-700' },
            { label: 'Verified', value: stats.verified, color: 'bg-blue-50 text-blue-700' },
            { label: 'Active', value: stats.active, color: 'bg-green-50 text-green-700' },
            { label: 'Suspended', value: stats.suspended, color: 'bg-red-50 text-red-700' },
            { label: 'Rejected', value: stats.rejected, color: 'bg-gray-50 text-gray-500' },
          ].map((stat) => (
            <div key={stat.label} className={`rounded-lg p-4 ${stat.color}`}>
              <p className="text-xs font-medium opacity-80">{stat.label}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search brands..."
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Brand</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Country</th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">Products</th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">Featured</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Created</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {brands.map((brand) => (
                <tr key={brand.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {brand.logo_url ? (
                        <img src={brand.logo_url} alt={brand.name} className="h-10 w-10 rounded-lg object-cover" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-200 text-sm font-bold text-gray-500">
                          {brand.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{brand.name}</p>
                        <p className="text-xs text-gray-500">{brand.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${BRAND_STATUS_COLORS[brand.status]}`}>
                      {BRAND_STATUS_LABELS[brand.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {brand.country_of_origin || '-'}
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-600">
                    {brand.product_count}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {brand.is_featured ? (
                      <span className="text-yellow-500" title="Featured">&#9733;</span>
                    ) : (
                      <span className="text-gray-300">&#9734;</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(brand.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(brand)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                      {getAvailableActions(brand).map((a) => (
                        <button
                          key={a.action}
                          onClick={() => setActionConfirm({ brand, action: a.action })}
                          className={`text-sm hover:underline ${a.color}`}
                        >
                          {a.label}
                        </button>
                      ))}
                      {brand.product_count === 0 && (
                        <button
                          onClick={() => setDeleteConfirm(brand)}
                          className="text-sm text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {brands.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-500">
                    No brands found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {meta.page} of {meta.totalPages} ({meta.total} brands)
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <button
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold">
              {modalMode === 'create' ? 'Add New Brand' : `Edit: ${editBrand?.name}`}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Brand Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Logo URL</label>
                  <input
                    type="text"
                    value={formLogoUrl}
                    onChange={(e) => setFormLogoUrl(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Banner URL</label>
                  <input
                    type="text"
                    value={formBannerUrl}
                    onChange={(e) => setFormBannerUrl(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Website URL</label>
                  <input
                    type="text"
                    value={formWebsiteUrl}
                    onChange={(e) => setFormWebsiteUrl(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Country of Origin</label>
                  <input
                    type="text"
                    value={formCountry}
                    onChange={(e) => setFormCountry(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : modalMode === 'create' ? 'Create Brand' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Action Confirmation Modal */}
      {actionConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-2 text-lg font-semibold">
              {actionConfirm.action.charAt(0).toUpperCase() + actionConfirm.action.slice(1)} Brand
            </h2>
            <p className="mb-4 text-sm text-gray-600">
              Are you sure you want to {actionConfirm.action} <strong>{actionConfirm.brand.name}</strong>?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setActionConfirm(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={verifyMutation.isPending || activateMutation.isPending || rejectMutation.isPending || suspendMutation.isPending}
                className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-2 text-lg font-semibold text-red-600">Delete Brand</h2>
            <p className="mb-4 text-sm text-gray-600">
              Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
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
