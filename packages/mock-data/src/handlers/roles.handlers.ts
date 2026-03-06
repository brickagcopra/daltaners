import { http, HttpResponse } from 'msw';
import { adminRoles, adminUsers, permissionGroups, allPermissionKeys } from '../data/roles';
import type { AdminRole, AdminUser } from '../data/roles';

// Mutable copies
let roles: AdminRole[] = JSON.parse(JSON.stringify(adminRoles));
let users: AdminUser[] = JSON.parse(JSON.stringify(adminUsers));

const BASE = '/api/v1';

export const rolesHandlers = [
  // ===== ROLES =====

  // GET all roles
  http.get(`${BASE}/admin/roles`, ({ request }) => {
    const url = new URL(request.url);
    const search = url.searchParams.get('search')?.toLowerCase() || '';

    let filtered = [...roles];
    if (search) {
      filtered = filtered.filter(
        (r) =>
          r.display_name.toLowerCase().includes(search) ||
          r.name.toLowerCase().includes(search) ||
          r.description.toLowerCase().includes(search),
      );
    }

    return HttpResponse.json({
      success: true,
      data: filtered,
      timestamp: new Date().toISOString(),
    });
  }),

  // GET single role
  http.get(`${BASE}/admin/roles/:id`, ({ params }) => {
    const role = roles.find((r) => r.id === params.id);
    if (!role) {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'ROLE_NOT_FOUND', message: 'Role not found', statusCode: 404 },
          timestamp: new Date().toISOString(),
        },
        { status: 404 },
      );
    }

    return HttpResponse.json({
      success: true,
      data: role,
      timestamp: new Date().toISOString(),
    });
  }),

  // POST create role
  http.post(`${BASE}/admin/roles`, async ({ request }) => {
    const body = (await request.json()) as {
      name: string;
      display_name: string;
      description: string;
      permissions: string[];
    };

    // Check name uniqueness
    if (roles.some((r) => r.name === body.name)) {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'ROLE_EXISTS', message: `Role with name "${body.name}" already exists`, statusCode: 409 },
          timestamp: new Date().toISOString(),
        },
        { status: 409 },
      );
    }

    const newRole: AdminRole = {
      id: `role-${String(roles.length + 1).padStart(3, '0')}`,
      name: body.name,
      display_name: body.display_name,
      description: body.description,
      is_system: false,
      permissions: body.permissions.filter((p) => allPermissionKeys.includes(p)),
      admin_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    roles.push(newRole);

    return HttpResponse.json(
      {
        success: true,
        data: newRole,
        timestamp: new Date().toISOString(),
      },
      { status: 201 },
    );
  }),

  // PATCH update role
  http.patch(`${BASE}/admin/roles/:id`, async ({ params, request }) => {
    const roleIndex = roles.findIndex((r) => r.id === params.id);
    if (roleIndex === -1) {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'ROLE_NOT_FOUND', message: 'Role not found', statusCode: 404 },
          timestamp: new Date().toISOString(),
        },
        { status: 404 },
      );
    }

    if (roles[roleIndex].is_system) {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'SYSTEM_ROLE', message: 'System roles cannot be modified', statusCode: 403 },
          timestamp: new Date().toISOString(),
        },
        { status: 403 },
      );
    }

    const body = (await request.json()) as Partial<{
      display_name: string;
      description: string;
      permissions: string[];
    }>;

    roles[roleIndex] = {
      ...roles[roleIndex],
      ...body,
      updated_at: new Date().toISOString(),
    };

    return HttpResponse.json({
      success: true,
      data: roles[roleIndex],
      timestamp: new Date().toISOString(),
    });
  }),

  // DELETE role
  http.delete(`${BASE}/admin/roles/:id`, ({ params }) => {
    const role = roles.find((r) => r.id === params.id);
    if (!role) {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'ROLE_NOT_FOUND', message: 'Role not found', statusCode: 404 },
          timestamp: new Date().toISOString(),
        },
        { status: 404 },
      );
    }

    if (role.is_system) {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'SYSTEM_ROLE', message: 'System roles cannot be deleted', statusCode: 403 },
          timestamp: new Date().toISOString(),
        },
        { status: 403 },
      );
    }

    if (role.admin_count > 0) {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'ROLE_IN_USE', message: `Cannot delete role with ${role.admin_count} assigned admins`, statusCode: 409 },
          timestamp: new Date().toISOString(),
        },
        { status: 409 },
      );
    }

    roles = roles.filter((r) => r.id !== params.id);

    return new HttpResponse(null, { status: 204 });
  }),

  // GET permission groups
  http.get(`${BASE}/admin/permissions`, () => {
    return HttpResponse.json({
      success: true,
      data: permissionGroups,
      timestamp: new Date().toISOString(),
    });
  }),

  // ===== ADMIN USERS =====

  // GET admin users
  http.get(`${BASE}/admin/admin-users`, ({ request }) => {
    const url = new URL(request.url);
    const search = url.searchParams.get('search')?.toLowerCase() || '';
    const roleId = url.searchParams.get('role_id') || '';
    const status = url.searchParams.get('status') || '';
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');

    let filtered = [...users];

    if (search) {
      filtered = filtered.filter(
        (u) =>
          u.email.toLowerCase().includes(search) ||
          u.first_name.toLowerCase().includes(search) ||
          u.last_name.toLowerCase().includes(search),
      );
    }

    if (roleId) {
      filtered = filtered.filter((u) => u.role_id === roleId);
    }

    if (status === 'active') {
      filtered = filtered.filter((u) => u.is_active);
    } else if (status === 'inactive') {
      filtered = filtered.filter((u) => !u.is_active);
    }

    const total = filtered.length;
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    return HttpResponse.json({
      success: true,
      data: paginated,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      timestamp: new Date().toISOString(),
    });
  }),

  // POST create admin user
  http.post(`${BASE}/admin/admin-users`, async ({ request }) => {
    const body = (await request.json()) as {
      email: string;
      first_name: string;
      last_name: string;
      role_id: string;
      password: string;
    };

    // Check email uniqueness
    if (users.some((u) => u.email === body.email)) {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'EMAIL_EXISTS', message: 'Admin with this email already exists', statusCode: 409 },
          timestamp: new Date().toISOString(),
        },
        { status: 409 },
      );
    }

    const role = roles.find((r) => r.id === body.role_id);
    if (!role) {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'ROLE_NOT_FOUND', message: 'Specified role does not exist', statusCode: 400 },
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      );
    }

    const newUser: AdminUser = {
      id: `admin-${String(users.length + 1).padStart(3, '0')}`,
      email: body.email,
      first_name: body.first_name,
      last_name: body.last_name,
      role_id: body.role_id,
      role_name: role.display_name,
      is_active: true,
      last_login_at: null,
      created_at: new Date().toISOString(),
    };

    users.push(newUser);

    // Increment role admin_count
    const roleIdx = roles.findIndex((r) => r.id === body.role_id);
    if (roleIdx !== -1) {
      roles[roleIdx].admin_count += 1;
    }

    return HttpResponse.json(
      {
        success: true,
        data: newUser,
        timestamp: new Date().toISOString(),
      },
      { status: 201 },
    );
  }),

  // PATCH update admin user
  http.patch(`${BASE}/admin/admin-users/:id`, async ({ params, request }) => {
    const userIndex = users.findIndex((u) => u.id === params.id);
    if (userIndex === -1) {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'ADMIN_NOT_FOUND', message: 'Admin user not found', statusCode: 404 },
          timestamp: new Date().toISOString(),
        },
        { status: 404 },
      );
    }

    const body = (await request.json()) as Partial<{
      first_name: string;
      last_name: string;
      role_id: string;
      is_active: boolean;
    }>;

    if (body.role_id) {
      const role = roles.find((r) => r.id === body.role_id);
      if (!role) {
        return HttpResponse.json(
          {
            success: false,
            error: { code: 'ROLE_NOT_FOUND', message: 'Specified role does not exist', statusCode: 400 },
            timestamp: new Date().toISOString(),
          },
          { status: 400 },
        );
      }

      // Update role counts
      const oldRoleIdx = roles.findIndex((r) => r.id === users[userIndex].role_id);
      if (oldRoleIdx !== -1) roles[oldRoleIdx].admin_count = Math.max(0, roles[oldRoleIdx].admin_count - 1);
      const newRoleIdx = roles.findIndex((r) => r.id === body.role_id);
      if (newRoleIdx !== -1) roles[newRoleIdx].admin_count += 1;

      body.role_id = body.role_id;
      (body as Record<string, unknown>).role_name = role.display_name;
    }

    users[userIndex] = {
      ...users[userIndex],
      ...body,
    };

    return HttpResponse.json({
      success: true,
      data: users[userIndex],
      timestamp: new Date().toISOString(),
    });
  }),

  // DELETE admin user
  http.delete(`${BASE}/admin/admin-users/:id`, ({ params }) => {
    const user = users.find((u) => u.id === params.id);
    if (!user) {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'ADMIN_NOT_FOUND', message: 'Admin user not found', statusCode: 404 },
          timestamp: new Date().toISOString(),
        },
        { status: 404 },
      );
    }

    // Decrement role count
    const roleIdx = roles.findIndex((r) => r.id === user.role_id);
    if (roleIdx !== -1) roles[roleIdx].admin_count = Math.max(0, roles[roleIdx].admin_count - 1);

    users = users.filter((u) => u.id !== params.id);

    return new HttpResponse(null, { status: 204 });
  }),
];
