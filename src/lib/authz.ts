import type { Session } from "next-auth";

/**
 * Role system
 *
 * Note: The database currently stores roles as strings.
 * This type reflects the roles that are *enforced* at the API layer.
 */
export type UserRole = "EMPLOYEE" | "ADMIN" | "SUPERUSER";

type RoleRank = Record<UserRole, number>;

const roleRank: RoleRank = {
  EMPLOYEE: 0,
  ADMIN: 1,
  SUPERUSER: 2,
};

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
  institutionId: number | null;
}

/**
 * Sentinel error messages used by API routes to map to HTTP status codes.
 */
export const AUTH_ERRORS = {
  UNAUTHORIZED: "UNAUTHORIZED",
} as const;

/**
 * Throws when there is no authenticated user.
 * API routes are responsible for catching this and returning 401.
 */
export function requireUser(session: Session | null): AuthenticatedUser {
  if (!session || !session.user) {
    throw new Error(AUTH_ERRORS.UNAUTHORIZED);
  }

  const { id, role, institutionId } = session.user as {
    id?: string | number;
    role?: string;
    institutionId?: number | string | null;
  };

  if (!id || !role) {
    throw new Error(AUTH_ERRORS.UNAUTHORIZED);
  }

  if (!isSupportedRole(role)) {
    throw new Error(AUTH_ERRORS.UNAUTHORIZED);
  }

  const normalizedId = String(id);
  const normalizedInstitutionId =
    institutionId === undefined || institutionId === null ? null : Number(institutionId);

  if (
    normalizedInstitutionId !== null &&
    (Number.isNaN(normalizedInstitutionId) || normalizedInstitutionId <= 0)
  ) {
    throw new Error(AUTH_ERRORS.UNAUTHORIZED);
  }

  return {
    id: normalizedId,
    role,
    institutionId: normalizedInstitutionId,
  };
}

function isSupportedRole(role: string): role is UserRole {
  return role === "EMPLOYEE" || role === "ADMIN" || role === "SUPERUSER";
}

function hasAtLeast(user: AuthenticatedUser, minimum: UserRole): boolean {
  return roleRank[user.role] >= roleRank[minimum];
}

// Shipments & releases

export function canReadShipment(user: AuthenticatedUser): boolean {
  return hasAtLeast(user, "EMPLOYEE");
}

export function canWriteShipment(user: AuthenticatedUser): boolean {
  return hasAtLeast(user, "EMPLOYEE");
}

export function canCreateRelease(user: AuthenticatedUser): boolean {
  return hasAtLeast(user, "EMPLOYEE");
}

// Suppliers

export function canReadSuppliers(user: AuthenticatedUser): boolean {
  return hasAtLeast(user, "EMPLOYEE");
}

export function canManageSuppliers(user: AuthenticatedUser): boolean {
  return hasAtLeast(user, "ADMIN");
}

// Institution profile

export function canManageInstitutionProfile(user: AuthenticatedUser): boolean {
  return hasAtLeast(user, "ADMIN");
}

// Platform / global

export function canCreateInstitution(user: AuthenticatedUser): boolean {
  return user.role === "SUPERUSER";
}

export function canManageGlobalButterflies(user: AuthenticatedUser): boolean {
  return user.role === "SUPERUSER";
}

export function canCrossTenant(user: AuthenticatedUser): boolean {
  return user.role === "SUPERUSER";
}

// User management

export function canManageUsers(user: AuthenticatedUser): boolean {
  return hasAtLeast(user, "ADMIN");
}

export function canModifyUser(actor: AuthenticatedUser, target: AuthenticatedUser): boolean {
  return roleRank[actor.role] >= roleRank[target.role];
}

export function canAssignRole(
  actor: AuthenticatedUser,
  newRole: UserRole,
  target?: AuthenticatedUser,
): boolean {
  if (!hasAtLeast(actor, "ADMIN")) {
    return false;
  }

  if (roleRank[actor.role] < roleRank[newRole]) {
    return false;
  }

  if (target && roleRank[actor.role] < roleRank[target.role]) {
    return false;
  }

  return true;
}

export function canDeleteUser(actor: AuthenticatedUser, target: AuthenticatedUser): boolean {
  if (!hasAtLeast(actor, "ADMIN")) {
    return false;
  }

  if (actor.id === target.id) {
    return false;
  }

  return roleRank[actor.role] > roleRank[target.role];
}
