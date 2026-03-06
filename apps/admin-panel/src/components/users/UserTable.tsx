import { type User } from '@/hooks/useUsers';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable, type Column } from '@/components/common/DataTable';

interface UserTableProps {
  users: User[];
  isLoading: boolean;
  onEdit: (user: User) => void;
  onSuspend: (user: User) => void;
  onActivate: (user: User) => void;
  onResetPassword: (user: User) => void;
}

const roleLabels: Record<string, string> = {
  customer: 'Customer',
  vendor_owner: 'Vendor Owner',
  vendor_staff: 'Vendor Staff',
  delivery: 'Rider',
  admin: 'Admin',
};

const roleBadgeVariant: Record<string, 'default' | 'secondary' | 'info' | 'warning' | 'success'> = {
  customer: 'default',
  vendor_owner: 'secondary',
  vendor_staff: 'info',
  delivery: 'warning',
  admin: 'success',
};

export function UserTable({ users, isLoading, onEdit, onSuspend, onActivate, onResetPassword }: UserTableProps) {
  const columns: Column<User>[] = [
    {
      key: 'user',
      header: 'User',
      render: (user) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {(user.email || user.phone || '?').charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-foreground">{user.email || user.phone || 'No contact'}</p>
            {user.email && user.phone && (
              <p className="text-xs text-muted-foreground">{user.phone}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (user) => (
        <Badge variant={roleBadgeVariant[user.role] || 'default'}>
          {roleLabels[user.role] || user.role}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (user) => (
        <Badge variant={user.is_active ? 'success' : 'destructive'}>
          {user.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'verified',
      header: 'Verified',
      render: (user) =>
        user.is_verified ? (
          <svg className="h-5 w-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ) : (
          <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
    },
    {
      key: 'createdAt',
      header: 'Joined',
      render: (user) => (
        <span className="text-sm text-muted-foreground">
          {new Date(user.created_at).toLocaleDateString('en-PH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (user) => (
        <div className="flex items-center justify-end gap-1">
          {/* Edit */}
          <Button variant="ghost" size="sm" onClick={() => onEdit(user)} title="Edit user">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </Button>
          {/* Reset password */}
          <Button variant="ghost" size="sm" onClick={() => onResetPassword(user)} title="Reset password">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </Button>
          {/* Activate / Deactivate */}
          {user.role !== 'admin' && (
            user.is_active ? (
              <Button variant="ghost" size="sm" onClick={() => onSuspend(user)} className="text-destructive hover:text-destructive" title="Deactivate user">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => onActivate(user)} className="text-green-600 hover:text-green-700" title="Activate user">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </Button>
            )
          )}
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={users}
      isLoading={isLoading}
      keyExtractor={(user) => user.id}
      emptyTitle="No users found"
      emptyDescription="No users match the current filters."
    />
  );
}
