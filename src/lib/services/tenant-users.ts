import { auth } from "@/auth";
import {
  requireUser,
  canManageUsers,
  canAssignRole,
  canModifyUser,
  canDeleteUser,
} from "@/lib/authz";
import { resolveTenantBySlug } from "@/lib/tenant";
import type { UserRole } from "@/lib/authz";

import {
  listUsersForTenant,
  createUser,
  updateUserForTenant,
  deleteUserForTenant,
  getUserByIdForTenant,
  countUsersForTenant,
} from "@/lib/queries/users";
import { updateInstitutionById } from "../queries/institution";

// ---------- TYPES ----------
type TenantContext = {
  slug: string;
};

type UserIdInput = TenantContext & {
  userId: number;
};

type CreateUserInput = TenantContext & {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
};

type UpdateUserInput = TenantContext & {
  userId: number;
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
};

// ---------- LIST ----------
export async function getTenantUsers({ slug }: TenantContext) {
  const user = requireUser(await auth());

  if (!canManageUsers(user)) {
    throw new Error("FORBIDDEN");
  }

  const tenantId = await resolveTenantBySlug(user, slug);

  return listUsersForTenant(tenantId, user);
}

// ---------- GET BY ID ----------
export async function getTenantUserById({ userId, slug }: UserIdInput) {
  const user = requireUser(await auth());

  if (!canManageUsers(user)) {
    throw new Error("FORBIDDEN");
  }

  const tenantId = await resolveTenantBySlug(user, slug);

  const target = await getUserByIdForTenant(userId, tenantId, user);

  if (!target) return null;

  if (!canModifyUser(user, target)) {
    throw new Error("FORBIDDEN");
  }

  return target;
}

// ---------- CREATE ----------
export async function createTenantUser(data: CreateUserInput) {
  const user = requireUser(await auth());

  if (!canManageUsers(user)) {
    throw new Error("FORBIDDEN");
  }

  const tenantId = await resolveTenantBySlug(user, data.slug);

  if (!canAssignRole(user, data.role ?? "EMPLOYEE")) {
    throw new Error("FORBIDDEN");
  }

  const { slug, ...userData } = data;
  // return createUser(tenantId, userData);
  const newUser = await createUser(tenantId, userData);

  // activate institution if this is the first user
  const userCount = await countUsersForTenant(tenantId);

  if (userCount === 1) {
    await updateInstitutionById(tenantId, {
      stats_active: true,
    });
  }

  return newUser;
}

// ---------- UPDATE ----------
export async function updateTenantUser(data: UpdateUserInput) {
  const user = requireUser(await auth());

  if (!canManageUsers(user)) {
    throw new Error("FORBIDDEN");
  }

  const tenantId = await resolveTenantBySlug(user, data.slug);

  const existing = await getUserByIdForTenant(data.userId, tenantId, user);
  if (!existing) return null;

  if (!canModifyUser(user, existing)) {
    throw new Error("FORBIDDEN");
  }

  const { slug, userId, ...updateData } = data;
  return updateUserForTenant(userId, tenantId, user, updateData);
}

// ---------- DELETE ----------
export async function deleteTenantUser({ userId, slug }: UserIdInput) {
  const user = requireUser(await auth());

  if (!canManageUsers(user)) {
    throw new Error("FORBIDDEN");
  }

  const tenantId = await resolveTenantBySlug(user, slug);

  const existing = await getUserByIdForTenant(userId, tenantId, user);
  if (!existing) return null;

  if (!canDeleteUser(user, existing)) {
    throw new Error("FORBIDDEN");
  }

  return deleteUserForTenant(userId, tenantId, user);
}
