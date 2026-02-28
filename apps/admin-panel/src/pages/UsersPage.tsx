import { useState } from 'react';
import { useUsers, useUpdateUser, type User } from '@/hooks/useUsers';
import { UserTable } from '@/components/users/UserTable';
import { SearchInput } from '@/components/common/SearchInput';
import { Pagination } from '@/components/common/Pagination';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const roleOptions = [
  { value: '', label: 'All Roles' },
  { value: 'customer', label: 'Customer' },
  { value: 'vendor_owner', label: 'Vendor Owner' },
  { value: 'vendor_staff', label: 'Vendor Staff' },
  { value: 'delivery', label: 'Rider' },
  { value: 'admin', label: 'Admin' },
];

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'banned', label: 'Banned' },
];

export function UsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [editUser, setEditUser] = useState<User | null>(null);
  const [suspendUser, setSuspendUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');

  const { data, isLoading } = useUsers({ page, limit: 20, search, role, status });
  const updateMutation = useUpdateUser();

  const handleEdit = (user: User) => {
    setEditUser(user);
    setEditName(user.name);
  };

  const handleSaveEdit = () => {
    if (!editUser) return;
    updateMutation.mutate(
      { id: editUser.id, data: { name: editName } },
      {
        onSuccess: () => setEditUser(null),
      },
    );
  };

  const handleSuspend = (user: User) => {
    setSuspendUser(user);
  };

  const handleConfirmSuspend = () => {
    if (!suspendUser) return;
    updateMutation.mutate(
      { id: suspendUser.id, data: { status: 'suspended' } },
      {
        onSuccess: () => setSuspendUser(null),
      },
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <p className="mt-1 text-sm text-gray-500">Manage platform users and accounts</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-72">
          <SearchInput
            value={search}
            onChange={(val) => { setSearch(val); setPage(1); }}
            placeholder="Search by name or email..."
          />
        </div>
        <div className="w-40">
          <Select
            options={roleOptions}
            value={role}
            onChange={(e) => { setRole(e.target.value); setPage(1); }}
          />
        </div>
        <div className="w-40">
          <Select
            options={statusOptions}
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <UserTable
          users={data?.data || []}
          isLoading={isLoading}
          onEdit={handleEdit}
          onSuspend={handleSuspend}
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

      {/* Edit Modal */}
      <Modal
        isOpen={!!editUser}
        onClose={() => setEditUser(null)}
        title="Edit User"
        description={`Update details for ${editUser?.email}`}
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button variant="outline" onClick={() => setEditUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} loading={updateMutation.isPending}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Suspend Confirmation */}
      <Modal
        isOpen={!!suspendUser}
        onClose={() => setSuspendUser(null)}
        title="Suspend User"
        description={`Are you sure you want to suspend ${suspendUser?.name}?`}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            This will prevent the user from accessing the platform. You can reactivate them later.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button variant="outline" onClick={() => setSuspendUser(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmSuspend}
              loading={updateMutation.isPending}
            >
              Suspend User
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
