import { useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import {
  useStoreStaff,
  useInviteStaff,
  useRemoveStaff,
  useUpdateStaffPermissions,
  type StaffMember,
} from '@/hooks/useStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

const AVAILABLE_PERMISSIONS = [
  { key: 'order:read', label: 'View Orders' },
  { key: 'order:manage', label: 'Manage Orders' },
  { key: 'product:read', label: 'View Products' },
  { key: 'product:manage', label: 'Manage Products' },
  { key: 'inventory:read', label: 'View Inventory' },
  { key: 'inventory:manage', label: 'Manage Inventory' },
  { key: 'analytics:read', label: 'View Analytics' },
];

export function StaffPage() {
  const user = useAuthStore((s) => s.user);
  const storeId = user?.vendorId || null;

  const { data: staff, isLoading } = useStoreStaff(storeId);
  const inviteMutation = useInviteStaff();
  const removeMutation = useRemoveStaff();
  const permissionsMutation = useUpdateStaffPermissions();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');
  const [invitePermissions, setInvitePermissions] = useState<string[]>([]);

  const [removeStaff, setRemoveStaff] = useState<StaffMember | null>(null);
  const [editPermStaff, setEditPermStaff] = useState<StaffMember | null>(null);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);

  const resetInviteForm = () => {
    setInviteEmail('');
    setInviteFirstName('');
    setInviteLastName('');
    setInvitePermissions([]);
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) return;
    inviteMutation.mutate(
      {
        storeId,
        staffData: {
          email: inviteEmail,
          firstName: inviteFirstName,
          lastName: inviteLastName,
          permissions: invitePermissions,
        },
      },
      {
        onSuccess: () => {
          setInviteOpen(false);
          resetInviteForm();
        },
      },
    );
  };

  const handleConfirmRemove = () => {
    if (!storeId || !removeStaff) return;
    removeMutation.mutate(
      { storeId, staffId: removeStaff.id },
      { onSuccess: () => setRemoveStaff(null) },
    );
  };

  const handleOpenEditPermissions = (member: StaffMember) => {
    setEditPermStaff(member);
    setEditPermissions([...member.permissions]);
  };

  const handleSavePermissions = () => {
    if (!storeId || !editPermStaff) return;
    permissionsMutation.mutate(
      { storeId, staffId: editPermStaff.id, permissions: editPermissions },
      { onSuccess: () => setEditPermStaff(null) },
    );
  };

  const togglePermission = (perms: string[], key: string): string[] => {
    return perms.includes(key)
      ? perms.filter((p) => p !== key)
      : [...perms, key];
  };

  if (isLoading) {
    return <LoadingSpinner size="lg" fullPage />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your team members and their permissions</p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          Invite Staff
        </Button>
      </div>

      {/* Staff List */}
      <div className="space-y-4">
        {(!staff || staff.length === 0) ? (
          <Card>
            <div className="py-8 text-center text-gray-500">
              <p className="text-sm">No staff members yet. Invite your first team member.</p>
            </div>
          </Card>
        ) : (
          staff.map((member) => (
            <Card key={member.id}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-600">
                    {member.firstName.charAt(0)}{member.lastName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">
                        {member.firstName} {member.lastName}
                      </p>
                      <Badge variant={member.role === 'vendor_owner' ? 'primary' : 'default'}>
                        {member.role === 'vendor_owner' ? 'Owner' : 'Staff'}
                      </Badge>
                      {!member.isActive && (
                        <Badge variant="warning">Inactive</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{member.email}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {member.permissions.map((perm) => (
                        <span
                          key={perm}
                          className="inline-block rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                        >
                          {perm}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                {member.role !== 'vendor_owner' && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEditPermissions(member)}
                    >
                      Permissions
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => setRemoveStaff(member)}
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Invite Modal */}
      <Modal
        isOpen={inviteOpen}
        onClose={() => { setInviteOpen(false); resetInviteForm(); }}
        title="Invite Staff Member"
        size="lg"
      >
        <form onSubmit={handleInvite} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={inviteFirstName}
              onChange={(e) => setInviteFirstName(e.target.value)}
              placeholder="Juan"
              required
            />
            <Input
              label="Last Name"
              value={inviteLastName}
              onChange={(e) => setInviteLastName(e.target.value)}
              placeholder="Dela Cruz"
              required
            />
          </div>
          <Input
            label="Email"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="staff@example.com"
            required
          />
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Permissions</label>
            <div className="space-y-2 rounded-lg border border-gray-200 p-3">
              {AVAILABLE_PERMISSIONS.map((perm) => (
                <label key={perm.key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={invitePermissions.includes(perm.key)}
                    onChange={() => setInvitePermissions((prev) => togglePermission(prev, perm.key))}
                    className="h-4 w-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">{perm.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => { setInviteOpen(false); resetInviteForm(); }}>
              Cancel
            </Button>
            <Button type="submit" isLoading={inviteMutation.isPending}>
              Send Invite
            </Button>
          </div>
        </form>
      </Modal>

      {/* Remove Confirmation */}
      <Modal
        isOpen={!!removeStaff}
        onClose={() => setRemoveStaff(null)}
        title="Remove Staff Member"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to remove{' '}
            <span className="font-medium">{removeStaff?.firstName} {removeStaff?.lastName}</span>{' '}
            from your team? They will lose access to the dashboard immediately.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setRemoveStaff(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmRemove}
              isLoading={removeMutation.isPending}
            >
              Remove
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Permissions Modal */}
      <Modal
        isOpen={!!editPermStaff}
        onClose={() => setEditPermStaff(null)}
        title={`Edit Permissions — ${editPermStaff?.firstName} ${editPermStaff?.lastName}`}
        size="lg"
      >
        <div className="space-y-4">
          <div className="space-y-2 rounded-lg border border-gray-200 p-3">
            {AVAILABLE_PERMISSIONS.map((perm) => (
              <label key={perm.key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editPermissions.includes(perm.key)}
                  onChange={() => setEditPermissions((prev) => togglePermission(prev, perm.key))}
                  className="h-4 w-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">{perm.label}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setEditPermStaff(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSavePermissions}
              isLoading={permissionsMutation.isPending}
            >
              Save Permissions
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
