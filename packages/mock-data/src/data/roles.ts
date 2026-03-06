// Admin Roles & Permissions Mock Data

export interface PermissionGroup {
  group: string;
  label: string;
  permissions: Permission[];
}

export interface Permission {
  key: string;
  label: string;
  description: string;
}

export interface AdminRole {
  id: string;
  name: string;
  display_name: string;
  description: string;
  is_system: boolean;
  permissions: string[];
  admin_count: number;
  created_at: string;
  updated_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role_id: string;
  role_name: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

// All available permissions grouped by domain
export const permissionGroups: PermissionGroup[] = [
  {
    group: 'dashboard',
    label: 'Dashboard',
    permissions: [
      { key: 'dashboard:view', label: 'View Dashboard', description: 'Access the main admin dashboard' },
      { key: 'dashboard:kpis', label: 'View KPIs', description: 'View platform KPI metrics' },
    ],
  },
  {
    group: 'users',
    label: 'User Management',
    permissions: [
      { key: 'users:view', label: 'View Users', description: 'View customer accounts list' },
      { key: 'users:create', label: 'Create Users', description: 'Create new user accounts' },
      { key: 'users:edit', label: 'Edit Users', description: 'Edit user account details' },
      { key: 'users:suspend', label: 'Suspend Users', description: 'Suspend/deactivate user accounts' },
      { key: 'users:delete', label: 'Delete Users', description: 'Permanently delete user accounts' },
    ],
  },
  {
    group: 'vendors',
    label: 'Vendor Management',
    permissions: [
      { key: 'vendors:view', label: 'View Vendors', description: 'View vendor/store list' },
      { key: 'vendors:approve', label: 'Approve Vendors', description: 'Approve new vendor applications' },
      { key: 'vendors:suspend', label: 'Suspend Vendors', description: 'Suspend vendor accounts' },
      { key: 'vendors:edit', label: 'Edit Vendors', description: 'Edit vendor details' },
      { key: 'vendors:performance', label: 'View Performance', description: 'View vendor performance metrics' },
      { key: 'vendors:policy', label: 'Manage Policy', description: 'Manage policy rules and violations' },
    ],
  },
  {
    group: 'orders',
    label: 'Order Management',
    permissions: [
      { key: 'orders:view', label: 'View Orders', description: 'View order list and details' },
      { key: 'orders:edit', label: 'Edit Orders', description: 'Modify order status and details' },
      { key: 'orders:cancel', label: 'Cancel Orders', description: 'Cancel orders on behalf of users' },
      { key: 'orders:refund', label: 'Process Refunds', description: 'Issue refunds for orders' },
      { key: 'orders:returns', label: 'Manage Returns', description: 'Handle return requests' },
      { key: 'orders:disputes', label: 'Manage Disputes', description: 'Handle dispute resolution' },
    ],
  },
  {
    group: 'catalog',
    label: 'Catalog Management',
    permissions: [
      { key: 'catalog:view', label: 'View Catalog', description: 'View products and categories' },
      { key: 'catalog:edit', label: 'Edit Catalog', description: 'Edit products and categories' },
      { key: 'catalog:approve', label: 'Approve Products', description: 'Approve vendor product submissions' },
      { key: 'catalog:brands', label: 'Manage Brands', description: 'Create and manage brand registry' },
      { key: 'catalog:pricing', label: 'Manage Pricing', description: 'Manage pricing rules and overrides' },
    ],
  },
  {
    group: 'finance',
    label: 'Financial Management',
    permissions: [
      { key: 'finance:view', label: 'View Financials', description: 'View financial reports' },
      { key: 'finance:settlements', label: 'Process Settlements', description: 'Generate and process vendor settlements' },
      { key: 'finance:tax', label: 'Manage Tax', description: 'Manage tax configurations and reports' },
      { key: 'finance:refunds', label: 'Approve Refunds', description: 'Approve high-value refunds' },
      { key: 'finance:export', label: 'Export Reports', description: 'Export financial data' },
    ],
  },
  {
    group: 'marketing',
    label: 'Marketing & Promotions',
    permissions: [
      { key: 'marketing:view', label: 'View Marketing', description: 'View marketing campaigns and promotions' },
      { key: 'marketing:coupons', label: 'Manage Coupons', description: 'Create and manage coupon codes' },
      { key: 'marketing:advertising', label: 'Manage Ads', description: 'Approve and manage ad campaigns' },
      { key: 'marketing:loyalty', label: 'Manage Loyalty', description: 'Configure loyalty program' },
      { key: 'marketing:notifications', label: 'Send Notifications', description: 'Send broadcast notifications' },
    ],
  },
  {
    group: 'delivery',
    label: 'Delivery & Logistics',
    permissions: [
      { key: 'delivery:view', label: 'View Delivery', description: 'View delivery operations' },
      { key: 'delivery:zones', label: 'Manage Zones', description: 'Create and edit delivery zones' },
      { key: 'delivery:shipping', label: 'Manage Shipping', description: 'Manage carriers and shipments' },
      { key: 'delivery:riders', label: 'Manage Riders', description: 'Manage delivery personnel' },
    ],
  },
  {
    group: 'platform',
    label: 'Platform Administration',
    permissions: [
      { key: 'platform:settings', label: 'Manage Settings', description: 'Modify platform settings' },
      { key: 'platform:roles', label: 'Manage Roles', description: 'Create and edit admin roles' },
      { key: 'platform:admins', label: 'Manage Admins', description: 'Add and remove admin users' },
      { key: 'platform:feature_flags', label: 'Feature Flags', description: 'Toggle feature flags' },
      { key: 'platform:audit_log', label: 'View Audit Log', description: 'Access audit trail' },
    ],
  },
];

// All permission keys flat
export const allPermissionKeys = permissionGroups.flatMap((g) => g.permissions.map((p) => p.key));

// Pre-defined admin roles
export const adminRoles: AdminRole[] = [
  {
    id: 'role-001',
    name: 'super_admin',
    display_name: 'Super Administrator',
    description: 'Full access to all platform features. Cannot be modified or deleted.',
    is_system: true,
    permissions: allPermissionKeys,
    admin_count: 2,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'role-002',
    name: 'admin',
    display_name: 'Administrator',
    description: 'Full operational access without platform administration capabilities.',
    is_system: true,
    permissions: allPermissionKeys.filter(
      (p) => !p.startsWith('platform:roles') && !p.startsWith('platform:admins'),
    ),
    admin_count: 3,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
  },
  {
    id: 'role-003',
    name: 'support',
    display_name: 'Customer Support',
    description: 'Access to orders, returns, disputes, and user management for support operations.',
    is_system: false,
    permissions: [
      'dashboard:view',
      'users:view', 'users:edit',
      'vendors:view',
      'orders:view', 'orders:edit', 'orders:cancel', 'orders:refund', 'orders:returns', 'orders:disputes',
      'catalog:view',
      'marketing:notifications',
    ],
    admin_count: 5,
    created_at: '2026-01-10T08:00:00Z',
    updated_at: '2026-02-20T14:00:00Z',
  },
  {
    id: 'role-004',
    name: 'finance',
    display_name: 'Finance Manager',
    description: 'Access to financial operations, settlements, tax, and reporting.',
    is_system: false,
    permissions: [
      'dashboard:view', 'dashboard:kpis',
      'vendors:view', 'vendors:performance',
      'orders:view', 'orders:refund',
      'finance:view', 'finance:settlements', 'finance:tax', 'finance:refunds', 'finance:export',
    ],
    admin_count: 2,
    created_at: '2026-01-10T08:00:00Z',
    updated_at: '2026-02-10T09:00:00Z',
  },
  {
    id: 'role-005',
    name: 'marketing',
    display_name: 'Marketing Manager',
    description: 'Access to marketing campaigns, promotions, loyalty, and advertising.',
    is_system: false,
    permissions: [
      'dashboard:view', 'dashboard:kpis',
      'catalog:view',
      'marketing:view', 'marketing:coupons', 'marketing:advertising', 'marketing:loyalty', 'marketing:notifications',
    ],
    admin_count: 2,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-02-25T16:00:00Z',
  },
  {
    id: 'role-006',
    name: 'content_manager',
    display_name: 'Content Manager',
    description: 'Access to catalog, brands, categories, and reviews management.',
    is_system: false,
    permissions: [
      'dashboard:view',
      'catalog:view', 'catalog:edit', 'catalog:approve', 'catalog:brands',
      'vendors:view',
    ],
    admin_count: 3,
    created_at: '2026-01-20T12:00:00Z',
    updated_at: '2026-02-18T11:00:00Z',
  },
  {
    id: 'role-007',
    name: 'operations',
    display_name: 'Operations Manager',
    description: 'Access to delivery, logistics, zones, and inventory operations.',
    is_system: false,
    permissions: [
      'dashboard:view', 'dashboard:kpis',
      'vendors:view', 'vendors:performance',
      'orders:view', 'orders:edit',
      'catalog:view',
      'delivery:view', 'delivery:zones', 'delivery:shipping', 'delivery:riders',
    ],
    admin_count: 2,
    created_at: '2026-02-01T09:00:00Z',
    updated_at: '2026-02-28T10:00:00Z',
  },
];

// Mock admin users
export const adminUsers: AdminUser[] = [
  {
    id: 'admin-001',
    email: 'superadmin@daltaners.ph',
    first_name: 'Carlos',
    last_name: 'Reyes',
    role_id: 'role-001',
    role_name: 'Super Administrator',
    is_active: true,
    last_login_at: '2026-03-04T08:30:00Z',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'admin-002',
    email: 'admin@daltaners.ph',
    first_name: 'Maria',
    last_name: 'Santos',
    role_id: 'role-001',
    role_name: 'Super Administrator',
    is_active: true,
    last_login_at: '2026-03-03T14:20:00Z',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'admin-003',
    email: 'jose.admin@daltaners.ph',
    first_name: 'Jose',
    last_name: 'Cruz',
    role_id: 'role-002',
    role_name: 'Administrator',
    is_active: true,
    last_login_at: '2026-03-04T09:00:00Z',
    created_at: '2026-01-05T10:00:00Z',
  },
  {
    id: 'admin-004',
    email: 'ana.admin@daltaners.ph',
    first_name: 'Ana',
    last_name: 'Dela Rosa',
    role_id: 'role-002',
    role_name: 'Administrator',
    is_active: true,
    last_login_at: '2026-03-02T16:45:00Z',
    created_at: '2026-01-10T08:00:00Z',
  },
  {
    id: 'admin-005',
    email: 'miguel.admin@daltaners.ph',
    first_name: 'Miguel',
    last_name: 'Garcia',
    role_id: 'role-002',
    role_name: 'Administrator',
    is_active: true,
    last_login_at: '2026-03-04T07:15:00Z',
    created_at: '2026-01-12T09:00:00Z',
  },
  {
    id: 'admin-006',
    email: 'support1@daltaners.ph',
    first_name: 'Liza',
    last_name: 'Mendoza',
    role_id: 'role-003',
    role_name: 'Customer Support',
    is_active: true,
    last_login_at: '2026-03-04T08:00:00Z',
    created_at: '2026-01-15T10:00:00Z',
  },
  {
    id: 'admin-007',
    email: 'support2@daltaners.ph',
    first_name: 'Ricardo',
    last_name: 'Bautista',
    role_id: 'role-003',
    role_name: 'Customer Support',
    is_active: true,
    last_login_at: '2026-03-03T18:30:00Z',
    created_at: '2026-01-15T10:00:00Z',
  },
  {
    id: 'admin-008',
    email: 'support3@daltaners.ph',
    first_name: 'Rosa',
    last_name: 'Villanueva',
    role_id: 'role-003',
    role_name: 'Customer Support',
    is_active: true,
    last_login_at: '2026-03-04T07:45:00Z',
    created_at: '2026-01-20T08:00:00Z',
  },
  {
    id: 'admin-009',
    email: 'support4@daltaners.ph',
    first_name: 'Paolo',
    last_name: 'Ramos',
    role_id: 'role-003',
    role_name: 'Customer Support',
    is_active: false,
    last_login_at: '2026-02-10T12:00:00Z',
    created_at: '2026-01-25T09:00:00Z',
  },
  {
    id: 'admin-010',
    email: 'support5@daltaners.ph',
    first_name: 'Elena',
    last_name: 'Torres',
    role_id: 'role-003',
    role_name: 'Customer Support',
    is_active: true,
    last_login_at: '2026-03-04T06:30:00Z',
    created_at: '2026-02-01T10:00:00Z',
  },
  {
    id: 'admin-011',
    email: 'finance1@daltaners.ph',
    first_name: 'David',
    last_name: 'Lim',
    role_id: 'role-004',
    role_name: 'Finance Manager',
    is_active: true,
    last_login_at: '2026-03-04T09:15:00Z',
    created_at: '2026-01-10T08:00:00Z',
  },
  {
    id: 'admin-012',
    email: 'finance2@daltaners.ph',
    first_name: 'Grace',
    last_name: 'Tan',
    role_id: 'role-004',
    role_name: 'Finance Manager',
    is_active: true,
    last_login_at: '2026-03-03T17:00:00Z',
    created_at: '2026-01-15T09:00:00Z',
  },
  {
    id: 'admin-013',
    email: 'marketing1@daltaners.ph',
    first_name: 'Patricia',
    last_name: 'Aquino',
    role_id: 'role-005',
    role_name: 'Marketing Manager',
    is_active: true,
    last_login_at: '2026-03-04T10:00:00Z',
    created_at: '2026-01-20T10:00:00Z',
  },
  {
    id: 'admin-014',
    email: 'marketing2@daltaners.ph',
    first_name: 'Kevin',
    last_name: 'Ong',
    role_id: 'role-005',
    role_name: 'Marketing Manager',
    is_active: true,
    last_login_at: '2026-03-02T15:30:00Z',
    created_at: '2026-02-01T10:00:00Z',
  },
  {
    id: 'admin-015',
    email: 'content1@daltaners.ph',
    first_name: 'Sophia',
    last_name: 'Reyes',
    role_id: 'role-006',
    role_name: 'Content Manager',
    is_active: true,
    last_login_at: '2026-03-04T08:45:00Z',
    created_at: '2026-01-25T10:00:00Z',
  },
  {
    id: 'admin-016',
    email: 'content2@daltaners.ph',
    first_name: 'Mark',
    last_name: 'Rivera',
    role_id: 'role-006',
    role_name: 'Content Manager',
    is_active: true,
    last_login_at: '2026-03-03T11:20:00Z',
    created_at: '2026-02-05T09:00:00Z',
  },
  {
    id: 'admin-017',
    email: 'content3@daltaners.ph',
    first_name: 'Anna',
    last_name: 'Fernandez',
    role_id: 'role-006',
    role_name: 'Content Manager',
    is_active: true,
    last_login_at: '2026-03-04T07:00:00Z',
    created_at: '2026-02-10T08:00:00Z',
  },
  {
    id: 'admin-018',
    email: 'ops1@daltaners.ph',
    first_name: 'Roberto',
    last_name: 'Pascual',
    role_id: 'role-007',
    role_name: 'Operations Manager',
    is_active: true,
    last_login_at: '2026-03-04T06:00:00Z',
    created_at: '2026-02-01T09:00:00Z',
  },
  {
    id: 'admin-019',
    email: 'ops2@daltaners.ph',
    first_name: 'Carmen',
    last_name: 'Diaz',
    role_id: 'role-007',
    role_name: 'Operations Manager',
    is_active: true,
    last_login_at: '2026-03-03T19:00:00Z',
    created_at: '2026-02-15T10:00:00Z',
  },
];
