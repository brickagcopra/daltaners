import { useState } from 'react';
import { useVendors, useApproveVendor, useSuspendVendor, type Vendor } from '@/hooks/useVendors';
import { exportToCSV } from '@/lib/csv-export';
import { VendorTable } from '@/components/vendors/VendorTable';
import { VendorApprovalModal } from '@/components/vendors/VendorApprovalModal';
import { SearchInput } from '@/components/common/SearchInput';
import { Pagination } from '@/components/common/Pagination';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'rejected', label: 'Rejected' },
];

const categoryOptions = [
  { value: '', label: 'All Categories' },
  { value: 'grocery', label: 'Grocery' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'fashion', label: 'Fashion' },
  { value: 'general', label: 'General' },
  { value: 'specialty', label: 'Specialty' },
];

export function VendorsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');

  const [approveVendor, setApproveVendor] = useState<Vendor | null>(null);
  const [suspendVendor, setSuspendVendor] = useState<Vendor | null>(null);
  const [suspendReason, setSuspendReason] = useState('');

  const { data, isLoading } = useVendors({ page, limit: 20, search, status, category });
  const approveMutation = useApproveVendor();
  const suspendMutation = useSuspendVendor();

  const handleApprove = (vendorId: string, commissionRate: number) => {
    approveMutation.mutate(
      { id: vendorId, commission_rate: commissionRate },
      { onSuccess: () => setApproveVendor(null) },
    );
  };

  const handleConfirmSuspend = () => {
    if (!suspendVendor || !suspendReason.trim()) return;
    suspendMutation.mutate(
      { id: suspendVendor.id, reason: suspendReason },
      {
        onSuccess: () => {
          setSuspendVendor(null);
          setSuspendReason('');
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendors</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage vendor stores, approvals, and suspensions
          </p>
        </div>
        <button
          className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
          onClick={() => {
            const vendors = data?.data;
            if (!vendors) return;
            exportToCSV(
              vendors,
              [
                { header: 'ID', accessor: (v: Vendor) => v.id },
                { header: 'Name', accessor: (v: Vendor) => v.name },
                { header: 'Category', accessor: (v: Vendor) => v.category },
                { header: 'Status', accessor: (v: Vendor) => v.status },
                { header: 'Commission Rate', accessor: (v: Vendor) => v.commission_rate },
                { header: 'Subscription', accessor: (v: Vendor) => v.subscription_tier },
                { header: 'Rating', accessor: (v: Vendor) => v.rating_average },
                { header: 'Total Orders', accessor: (v: Vendor) => v.total_orders },
                { header: 'Phone', accessor: (v: Vendor) => v.contact_phone },
                { header: 'Email', accessor: (v: Vendor) => v.contact_email },
                { header: 'Featured', accessor: (v: Vendor) => v.is_featured },
                { header: 'Created', accessor: (v: Vendor) => v.created_at },
              ],
              `vendors-export-${new Date().toISOString().split('T')[0]}`,
            );
          }}
        >
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-72">
          <SearchInput
            value={search}
            onChange={(val) => { setSearch(val); setPage(1); }}
            placeholder="Search stores or owners..."
          />
        </div>
        <div className="w-40">
          <Select
            options={statusOptions}
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          />
        </div>
        <div className="w-40">
          <Select
            options={categoryOptions}
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <VendorTable
          vendors={Array.isArray(data?.data) ? data.data : []}
          isLoading={isLoading}
          onApprove={(v) => setApproveVendor(v)}
          onSuspend={(v) => setSuspendVendor(v)}
        />
        {data?.meta && (
          <Pagination
            page={data.meta.page}
            totalPages={data.meta.totalPages}
            total={data.meta.total}
            limit={data.meta.limit}
            onPageChange={setPage}
          />
        )}
      </div>

      {/* Approval Modal */}
      <VendorApprovalModal
        vendor={approveVendor}
        isOpen={!!approveVendor}
        onClose={() => setApproveVendor(null)}
        onApprove={handleApprove}
        isLoading={approveMutation.isPending}
      />

      {/* Suspend Modal */}
      <Modal
        isOpen={!!suspendVendor}
        onClose={() => { setSuspendVendor(null); setSuspendReason(''); }}
        title="Suspend Vendor"
        description={`Suspend ${suspendVendor?.name}?`}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            This will hide the store from customers and prevent new orders. All pending orders will continue to be processed.
          </p>
          <Input
            label="Reason for suspension"
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
            placeholder="Provide a reason..."
            required
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button variant="outline" onClick={() => { setSuspendVendor(null); setSuspendReason(''); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmSuspend}
              loading={suspendMutation.isPending}
              disabled={!suspendReason.trim()}
            >
              Suspend Vendor
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
