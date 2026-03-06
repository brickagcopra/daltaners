import { useState } from 'react';
import { useUsers, useUpdateUser, useCreateUser, useResetUserPassword, type User } from '@/hooks/useUsers';
import { exportToCSV } from '@/lib/csv-export';
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
  { value: 'inactive', label: 'Inactive' },
];

const createRoleOptions = [
  { value: 'customer', label: 'Customer' },
  { value: 'vendor_owner', label: 'Vendor Owner' },
  { value: 'vendor_staff', label: 'Vendor Staff' },
  { value: 'delivery', label: 'Rider' },
  { value: 'admin', label: 'Admin' },
];

export function UsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');

  // Edit modal state
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState('');

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createFirstName, setCreateFirstName] = useState('');
  const [createLastName, setCreateLastName] = useState('');
  const [createRole, setCreateRole] = useState('customer');

  // Deactivate modal state
  const [suspendUser, setSuspendUser] = useState<User | null>(null);

  // Password reset state
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [tempPassword, setTempPassword] = useState('');

  const { data, isLoading } = useUsers({ page, limit: 20, search, role, status });
  const updateMutation = useUpdateUser();
  const createMutation = useCreateUser();
  const resetPasswordMutation = useResetUserPassword();

  const handleEdit = (user: User) => {
    setEditUser(user);
    setEditEmail(user.email || '');
    setEditPhone(user.phone || '');
    setEditRole(user.role);
  };

  const handleSaveEdit = () => {
    if (!editUser) return;
    const data: Record<string, unknown> = {};
    if (editEmail !== (editUser.email || '')) data.email = editEmail || undefined;
    if (editPhone !== (editUser.phone || '')) data.phone = editPhone || undefined;
    if (editRole !== editUser.role) data.role = editRole;

    if (Object.keys(data).length === 0) {
      setEditUser(null);
      return;
    }

    updateMutation.mutate(
      { id: editUser.id, data },
      { onSuccess: () => setEditUser(null) },
    );
  };

  const handleSuspend = (user: User) => {
    setSuspendUser(user);
  };

  const handleConfirmSuspend = () => {
    if (!suspendUser) return;
    updateMutation.mutate(
      { id: suspendUser.id, data: { is_active: false } },
      { onSuccess: () => setSuspendUser(null) },
    );
  };

  const handleActivate = (user: User) => {
    updateMutation.mutate(
      { id: user.id, data: { is_active: true } },
    );
  };

  const handleResetPassword = (user: User) => {
    setResetUser(user);
    setTempPassword('');
  };

  const handleConfirmReset = () => {
    if (!resetUser) return;
    resetPasswordMutation.mutate(resetUser.id, {
      onSuccess: (res) => {
        setTempPassword(res.data.temporary_password);
      },
    });
  };

  const handleCreate = () => {
    createMutation.mutate(
      {
        email: createEmail || undefined,
        phone: createPhone || undefined,
        password: createPassword,
        first_name: createFirstName,
        last_name: createLastName,
        role: createRole,
      },
      {
        onSuccess: () => {
          setShowCreate(false);
          setCreateEmail('');
          setCreatePhone('');
          setCreatePassword('');
          setCreateFirstName('');
          setCreateLastName('');
          setCreateRole('customer');
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="mt-1 text-sm text-gray-500">Manage platform users and accounts</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() =>
              data?.data &&
              exportToCSV(
                data.data,
                [
                  { header: 'ID', accessor: (u) => u.id },
                  { header: 'Email', accessor: (u) => u.email },
                  { header: 'Phone', accessor: (u) => u.phone },
                  { header: 'Role', accessor: (u) => u.role },
                  { header: 'Verified', accessor: (u) => u.is_verified },
                  { header: 'Active', accessor: (u) => u.is_active },
                  { header: 'Last Login', accessor: (u) => u.last_login_at },
                  { header: 'Created', accessor: (u) => u.created_at },
                ],
                `users-export-${new Date().toISOString().split('T')[0]}`,
              )
            }
          >
            Export CSV
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create User
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-72">
          <SearchInput
            value={search}
            onChange={(val) => { setSearch(val); setPage(1); }}
            placeholder="Search by email or phone..."
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
          users={Array.isArray(data?.data) ? data.data : []}
          isLoading={isLoading}
          onEdit={handleEdit}
          onSuspend={handleSuspend}
          onActivate={handleActivate}
          onResetPassword={handleResetPassword}
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

      {/* Create User Modal */}
      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create User"
        description="Add a new user to the platform"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={createFirstName}
              onChange={(e) => setCreateFirstName(e.target.value)}
              placeholder="Juan"
            />
            <Input
              label="Last Name"
              value={createLastName}
              onChange={(e) => setCreateLastName(e.target.value)}
              placeholder="Dela Cruz"
            />
          </div>
          <Input
            label="Email"
            type="email"
            value={createEmail}
            onChange={(e) => setCreateEmail(e.target.value)}
            placeholder="user@example.com"
          />
          <Input
            label="Phone"
            value={createPhone}
            onChange={(e) => setCreatePhone(e.target.value)}
            placeholder="+639171234567"
          />
          <Input
            label="Password"
            type="password"
            value={createPassword}
            onChange={(e) => setCreatePassword(e.target.value)}
            placeholder="Min 8 characters"
          />
          <Select
            label="Role"
            options={createRoleOptions}
            value={createRole}
            onChange={(e) => setCreateRole(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              loading={createMutation.isPending}
              disabled={!createPassword || !createFirstName || !createLastName || (!createEmail && !createPhone)}
            >
              Create User
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editUser}
        onClose={() => setEditUser(null)}
        title="Edit User"
        description={`Update details for ${editUser?.email || editUser?.phone}`}
      >
        <div className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={editEmail}
            onChange={(e) => setEditEmail(e.target.value)}
          />
          <Input
            label="Phone"
            value={editPhone}
            onChange={(e) => setEditPhone(e.target.value)}
          />
          <Select
            label="Role"
            options={createRoleOptions}
            value={editRole}
            onChange={(e) => setEditRole(e.target.value)}
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

      {/* Deactivate Confirmation */}
      <Modal
        isOpen={!!suspendUser}
        onClose={() => setSuspendUser(null)}
        title="Deactivate User"
        description={`Are you sure you want to deactivate ${suspendUser?.email || suspendUser?.phone}?`}
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
              Deactivate User
            </Button>
          </div>
        </div>
      </Modal>

      {/* Password Reset Modal */}
      <Modal
        isOpen={!!resetUser}
        onClose={() => setResetUser(null)}
        title="Reset Password"
        description={`Reset password for ${resetUser?.email || resetUser?.phone}`}
      >
        <div className="space-y-4">
          {tempPassword ? (
            <>
              <p className="text-sm text-gray-600">
                Password has been reset. Share this temporary password with the user:
              </p>
              <div className="rounded-lg bg-gray-100 p-3 font-mono text-sm select-all">
                {tempPassword}
              </div>
              <p className="text-xs text-gray-500">
                The user will need to change this password after logging in.
              </p>
              <div className="flex justify-end pt-4 border-t border-gray-200">
                <Button onClick={() => setResetUser(null)}>Done</Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-600">
                This will generate a new temporary password and revoke all existing sessions for this user.
              </p>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <Button variant="outline" onClick={() => setResetUser(null)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleConfirmReset}
                  loading={resetPasswordMutation.isPending}
                >
                  Reset Password
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
