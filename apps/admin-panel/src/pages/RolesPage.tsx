import { useState } from 'react';
import {
  useAdminRoles,
  usePermissionGroups,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  useAdminUsers,
  useCreateAdminUser,
  useUpdateAdminUser,
  useDeleteAdminUser,
} from '@/hooks/useRoles';
import type { AdminRole, AdminUser, PermissionGroup } from '@/hooks/useRoles';

type ActiveTab = 'roles' | 'admins';

export function RolesPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('roles');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Roles & Permissions</h1>
        <p className="mt-1 text-sm text-gray-500">Manage admin roles, permissions, and admin user accounts</p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {([
            { key: 'roles' as const, label: 'Roles & Permissions' },
            { key: 'admins' as const, label: 'Admin Users' },
          ]).map((tab) => (
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

      {activeTab === 'roles' && <RolesTab />}
      {activeTab === 'admins' && <AdminUsersTab />}
    </div>
  );
}

// ========== ROLES TAB ==========

function RolesTab() {
  const [search, setSearch] = useState('');
  const { data: rolesData, isLoading } = useAdminRoles(search || undefined);
  const { data: permsData } = usePermissionGroups();
  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole();
  const deleteMutation = useDeleteRole();

  const [editRole, setEditRole] = useState<AdminRole | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const roles = rolesData?.data || [];
  const permGroups = permsData?.data || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search roles..."
          className="w-64 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          Create Role
        </button>
      </div>

      {/* Role cards */}
      <div className="space-y-4">
        {roles.map((role) => (
          <div key={role.id} className="rounded-xl border border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-gray-900">{role.display_name}</h3>
                  {role.is_system && (
                    <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">System</span>
                  )}
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono text-gray-500">{role.name}</span>
                </div>
                <p className="mt-1 text-sm text-gray-500">{role.description}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">{role.admin_count} admin{role.admin_count !== 1 ? 's' : ''}</span>
                <button
                  onClick={() => setEditRole(role)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  {role.is_system ? 'View' : 'Edit'}
                </button>
                {!role.is_system && role.admin_count === 0 && (
                  <button
                    onClick={() => {
                      if (confirm(`Delete role "${role.display_name}"?`)) {
                        deleteMutation.mutate(role.id);
                      }
                    }}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
            {/* Permission summary */}
            <div className="px-6 py-3">
              <div className="flex flex-wrap gap-1.5">
                {permGroups.map((group) => {
                  const groupPerms = group.permissions.map((p) => p.key);
                  const assignedCount = groupPerms.filter((pk) => role.permissions.includes(pk)).length;
                  if (assignedCount === 0) return null;
                  const isAll = assignedCount === groupPerms.length;
                  return (
                    <span
                      key={group.group}
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        isAll
                          ? 'bg-green-50 text-green-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {group.label} ({assignedCount}/{groupPerms.length})
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit Modal */}
      {(showCreate || editRole) && (
        <RoleFormModal
          role={editRole}
          permGroups={permGroups}
          readOnly={editRole?.is_system || false}
          onClose={() => {
            setShowCreate(false);
            setEditRole(null);
          }}
          onSave={(data) => {
            if (editRole) {
              updateMutation.mutate(
                { id: editRole.id, data },
                {
                  onSuccess: () => {
                    setEditRole(null);
                  },
                },
              );
            } else {
              createMutation.mutate(data as { name: string; display_name: string; description: string; permissions: string[] }, {
                onSuccess: () => {
                  setShowCreate(false);
                },
              });
            }
          }}
          saving={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </div>
  );
}

function RoleFormModal({
  role,
  permGroups,
  readOnly,
  onClose,
  onSave,
  saving,
}: {
  role: AdminRole | null;
  permGroups: PermissionGroup[];
  readOnly: boolean;
  onClose: () => void;
  onSave: (data: Partial<{ name: string; display_name: string; description: string; permissions: string[] }>) => void;
  saving: boolean;
}) {
  const [name, setName] = useState(role?.name || '');
  const [displayName, setDisplayName] = useState(role?.display_name || '');
  const [description, setDescription] = useState(role?.description || '');
  const [permissions, setPermissions] = useState<Set<string>>(new Set(role?.permissions || []));

  const togglePermission = (key: string) => {
    if (readOnly) return;
    setPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleGroup = (group: PermissionGroup) => {
    if (readOnly) return;
    const groupKeys = group.permissions.map((p) => p.key);
    const allSelected = groupKeys.every((k) => permissions.has(k));
    setPermissions((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        groupKeys.forEach((k) => next.delete(k));
      } else {
        groupKeys.forEach((k) => next.add(k));
      }
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 py-10">
      <div className="w-full max-w-3xl rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {readOnly ? 'View Role' : role ? 'Edit Role' : 'Create Role'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-6">
          {/* Basic info */}
          <div className="space-y-3">
            {!role && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Role Name (slug)</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="e.g. customer_support"
                  disabled={readOnly}
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                disabled={readOnly}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                rows={2}
                disabled={readOnly}
              />
            </div>
          </div>

          {/* Permission matrix */}
          <div className="mt-6">
            <h4 className="text-sm font-semibold text-gray-900">Permissions ({permissions.size} selected)</h4>
            <div className="mt-3 space-y-4">
              {permGroups.map((group) => {
                const groupKeys = group.permissions.map((p) => p.key);
                const selectedCount = groupKeys.filter((k) => permissions.has(k)).length;
                const allSelected = selectedCount === groupKeys.length;

                return (
                  <div key={group.group} className="rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={() => toggleGroup(group)}
                        disabled={readOnly}
                        className="h-4 w-4 rounded border-gray-300 text-primary"
                      />
                      <span className="text-sm font-medium text-gray-900">{group.label}</span>
                      <span className="text-xs text-gray-400">
                        ({selectedCount}/{groupKeys.length})
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-0 divide-y divide-gray-50 md:grid-cols-2">
                      {group.permissions.map((perm) => (
                        <label
                          key={perm.key}
                          className={`flex items-start gap-3 px-4 py-2.5 ${readOnly ? '' : 'cursor-pointer hover:bg-gray-50'}`}
                        >
                          <input
                            type="checkbox"
                            checked={permissions.has(perm.key)}
                            onChange={() => togglePermission(perm.key)}
                            disabled={readOnly}
                            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary"
                          />
                          <div>
                            <span className="text-sm font-medium text-gray-700">{perm.label}</span>
                            <p className="text-xs text-gray-400">{perm.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
            {readOnly ? 'Close' : 'Cancel'}
          </button>
          {!readOnly && (
            <button
              onClick={() => {
                const data: Record<string, unknown> = {
                  display_name: displayName,
                  description,
                  permissions: Array.from(permissions),
                };
                if (!role) data.name = name;
                onSave(data);
              }}
              disabled={saving || (!role && !name) || !displayName}
              className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? 'Saving...' : role ? 'Update Role' : 'Create Role'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ========== ADMIN USERS TAB ==========

function AdminUsersTab() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data: usersData, isLoading } = useAdminUsers({ page, limit: 20, search: search || undefined, role_id: roleFilter || undefined, status: statusFilter || undefined });
  const { data: rolesData } = useAdminRoles();
  const createMutation = useCreateAdminUser();
  const updateMutation = useUpdateAdminUser();
  const deleteMutation = useDeleteAdminUser();

  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);

  const [form, setForm] = useState({ email: '', first_name: '', last_name: '', role_id: '', password: '' });

  const users = usersData?.data || [];
  const meta = usersData?.meta;
  const roles = rolesData?.data || [];

  const resetForm = () => setForm({ email: '', first_name: '', last_name: '', role_id: '', password: '' });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search admins..."
            className="w-56 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All Roles</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{r.display_name}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <button
          onClick={() => { resetForm(); setShowCreate(true); }}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          Add Admin
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Last Login</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  {user.first_name} {user.last_name}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{user.email}</td>
                <td className="px-6 py-4">
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                    {user.role_name}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    user.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {user.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'Never'}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setEditUser(user);
                        setForm({
                          email: user.email,
                          first_name: user.first_name,
                          last_name: user.last_name,
                          role_id: user.role_id,
                          password: '',
                        });
                      }}
                      className="rounded border border-gray-300 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        updateMutation.mutate({
                          id: user.id,
                          data: { is_active: !user.is_active },
                        });
                      }}
                      className={`rounded border px-2.5 py-1 text-xs ${
                        user.is_active
                          ? 'border-amber-200 text-amber-600 hover:bg-amber-50'
                          : 'border-green-200 text-green-600 hover:bg-green-50'
                      }`}
                    >
                      {user.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Remove admin "${user.first_name} ${user.last_name}"?`)) {
                          deleteMutation.mutate(user.id);
                        }
                      }}
                      className="rounded border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                  No admin users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {(page - 1) * 20 + 1}-{Math.min(page * 20, meta.total)} of {meta.total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={page === meta.totalPages}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Create / Edit Admin Modal */}
      {(showCreate || editUser) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">
              {editUser ? 'Edit Admin User' : 'Add Admin User'}
            </h3>
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">First Name</label>
                  <input
                    type="text"
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Name</label>
                  <input
                    type="text"
                    value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  disabled={!!editUser}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <select
                  value={form.role_id}
                  onChange={(e) => setForm({ ...form, role_id: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Select a role</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.display_name}</option>
                  ))}
                </select>
              </div>
              {!editUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Minimum 8 characters"
                  />
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => { setShowCreate(false); setEditUser(null); resetForm(); }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (editUser) {
                    updateMutation.mutate(
                      {
                        id: editUser.id,
                        data: {
                          first_name: form.first_name,
                          last_name: form.last_name,
                          role_id: form.role_id,
                        },
                      },
                      {
                        onSuccess: () => {
                          setEditUser(null);
                          resetForm();
                        },
                      },
                    );
                  } else {
                    createMutation.mutate(form, {
                      onSuccess: () => {
                        setShowCreate(false);
                        resetForm();
                      },
                    });
                  }
                }}
                disabled={createMutation.isPending || updateMutation.isPending || !form.first_name || !form.role_id || (!editUser && (!form.email || !form.password))}
                className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {(createMutation.isPending || updateMutation.isPending) ? 'Saving...' : editUser ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RolesPage;
