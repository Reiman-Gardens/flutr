import type { Session } from "next-auth";

/**
 *
 * Authentication Guard
 *
 */

export function requireUser(session: Session | null) {
  if (!session?.user) {
    throw new Error("UNAUTHORIZED");
  }
  return session.user;
}

/**
 *
 * Role System
 *
 */
export const roleRank = {
  EMPLOYEE: 0,
  ADMIN: 1,
  ORG_SUPERUSER: 2,
  SUPERUSER: 3,
} as const;

type RoleKey = keyof typeof roleRank;

function getRoleRank(role?: string | null): number {
  if (!role) return -1;
  return role in roleRank ? roleRank[role as RoleKey] : -1;
}

function hasMinRole(user: { role?: string | null }, minRole: RoleKey): boolean {
  return getRoleRank(user.role) >= roleRank[minRole];
}

function isSuperUser(user: { role?: string | null }): boolean {
  return getRoleRank(user.role) === roleRank.SUPERUSER;
}

function isSameUser(
  actor: { id?: string | number | null },
  target: { id?: string | number | null },
): boolean {
  if (actor.id == null || target.id == null) return false;
  return String(actor.id) === String(target.id);
}

/**
 *
 * Shipment & Release Permissions
 *
 */

export function canReadShipment(user: { role?: string | null }) {
  return hasMinRole(user, "EMPLOYEE");
}

export function canWriteShipment(user: { role?: string | null }) {
  return hasMinRole(user, "EMPLOYEE");
}

export function canCreateRelease(user: { role?: string | null }) {
  return hasMinRole(user, "EMPLOYEE");
}

/**
 *
 * Supplier Permissions
 *
 */

export function canReadSuppliers(user: { role?: string | null }) {
  return hasMinRole(user, "EMPLOYEE");
}

export function canManageSuppliers(user: { role?: string | null }) {
  return hasMinRole(user, "ADMIN");
}

/**
 *
 * Institution Permissions
 *
 */

export function canManageInstitutionProfile(user: { role?: string | null }) {
  return hasMinRole(user, "ADMIN");
}

export function canCreateInstitution(user: { role?: string | null }) {
  return isSuperUser(user);
}

export function canManageGlobalButterflies(user: { role?: string | null }) {
  return isSuperUser(user);
}

/**
 *
 * User Management Permissions
 *
 */

export function canManageUsers(user: { role?: string | null }) {
  return hasMinRole(user, "ADMIN");
}

export function canModifyUser(
  actor: { id?: string | number | null; role?: string | null },
  target: { id?: string | number | null; role?: string | null },
): boolean {
  if (isSuperUser(actor)) return true;

  const actorRank = getRoleRank(actor.role);
  const targetRank = getRoleRank(target.role);

  if (actorRank === roleRank.ORG_SUPERUSER) {
    if (isSameUser(actor, target)) return true;
    return targetRank <= roleRank.ADMIN;
  }

  if (actorRank === roleRank.ADMIN) {
    if (isSameUser(actor, target)) return true;
    return targetRank === roleRank.EMPLOYEE;
  }

  return false;
}

export function canAssignRole(
  actor: { id?: string | number | null; role?: string | null },
  newRole: string,
  target?: { id?: string | number | null; role?: string | null },
): boolean {
  if (target && isSameUser(actor, target)) {
    return false;
  }

  const actorRank = getRoleRank(actor.role);

  if (actorRank === roleRank.SUPERUSER) return true;

  if (newRole === "SUPERUSER") return false;

  if (actorRank === roleRank.ORG_SUPERUSER) {
    return newRole === "ADMIN" || newRole === "EMPLOYEE";
  }

  if (actorRank === roleRank.ADMIN) {
    return newRole === "EMPLOYEE";
  }

  return false;
}

export function canDeleteUser(
  actor: { id?: string | number | null; role?: string | null },
  target: { id?: string | number | null; role?: string | null },
): boolean {
  if (isSameUser(actor, target)) return false;

  if (isSuperUser(actor)) return true;

  const actorRank = getRoleRank(actor.role);
  const targetRank = getRoleRank(target.role);

  if (actorRank === roleRank.ORG_SUPERUSER) {
    return targetRank <= roleRank.ADMIN;
  }

  if (actorRank === roleRank.ADMIN) {
    return targetRank === roleRank.EMPLOYEE;
  }

  return false;
}

/**
 *
 * Cross-Tenant Permissions
 *
 */

export function canCrossTenant(user: { role?: string | null }) {
  return isSuperUser(user);
}
