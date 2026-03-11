// Permissions
// - SUPERUSER: All permissions including cross-tenant, create institution, manage butterflies
// - ADMIN: View dashboard/shipments, create release/shipment/employee, manage suppliers/users,
//   change butterfly metadata, view reports (cannot create other admins)
// - EMPLOYEE: View dashboard/shipments, create release/shipment
export type Role = "SUPERUSER" | "ADMIN" | "EMPLOYEE" | string;

export type Permission =
  | "VIEW_DASHBOARD"
  | "VIEW_SHIPMENTS"
  | "CREATE_RELEASE"
  | "CREATE_SHIPMENT"
  | "VIEW_INVENTORY"
  | "EDIT_INVENTORY"
  | "MANAGE_SUPPLIERS"
  | "CREATE_EMPLOYEE"
  | "CREATE_ADMIN"
  | "MANAGE_USERS"
  | "CHANGE_BUTTERFLY"
  | "CREATE_INSTITUTION"
  | "CROSS_TENANT_ACCESS"
  | "MANAGE_BUTTERFLIES"
  | "VIEW_REPORTS"
  | "MANAGE_INSTITUTION";

export const PERMISSION_MATRIX: Record<Role, Permission[]> = {
  SUPERUSER: [
    "VIEW_DASHBOARD",
    "VIEW_SHIPMENTS",
    "CREATE_RELEASE",
    "CREATE_SHIPMENT",
    "VIEW_INVENTORY",
    "EDIT_INVENTORY",
    "MANAGE_SUPPLIERS",
    "CREATE_EMPLOYEE",
    "CREATE_ADMIN",
    "MANAGE_USERS",
    "CHANGE_BUTTERFLY",
    "CREATE_INSTITUTION",
    "CROSS_TENANT_ACCESS",
    "MANAGE_BUTTERFLIES",
    "VIEW_REPORTS",
    "MANAGE_INSTITUTION",
  ],
  ADMIN: [
    "VIEW_DASHBOARD",
    "VIEW_SHIPMENTS",
    "CREATE_RELEASE",
    "CREATE_SHIPMENT",
    "MANAGE_SUPPLIERS",
    "CREATE_EMPLOYEE",
    "MANAGE_USERS",
    "CHANGE_BUTTERFLY",
    "VIEW_REPORTS",
  ],
  EMPLOYEE: ["VIEW_DASHBOARD", "VIEW_SHIPMENTS", "CREATE_RELEASE", "CREATE_SHIPMENT"],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  const perms = PERMISSION_MATRIX[role as Role];
  if (!perms) return false;
  return perms.includes(permission);
}
