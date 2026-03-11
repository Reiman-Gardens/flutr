import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Role, Permission } from "@/lib/permissions";
import { hasPermission } from "@/lib/permissions";

// Middleware matcher: protects both authenticated public and admin routes.
// Public/unauthenticated routes (login, signup) bypass middleware.
export const config = {
  matcher: ["/:institution/(admin|public)/:path*"],
};

// Admin subpath required permissions. Employees blocked from admin routes entirely.
const ADMIN_PATH_PERMISSION_MAP: Record<string, Permission[]> = {
  shipments: ["VIEW_SHIPMENTS"],
  releases: ["CREATE_RELEASE"],
  suppliers: ["MANAGE_SUPPLIERS"],
  employees: ["CREATE_EMPLOYEE"],
  users: ["MANAGE_USERS"],
  butterflies: ["CHANGE_BUTTERFLY"],
  dashboard: ["VIEW_DASHBOARD"],
  inventory: ["VIEW_INVENTORY", "EDIT_INVENTORY"],
};

// Employee (authenticated, non-admin) subpath required permissions.
// Employees access their shipments, releases, and inventory here.
const EMPLOYEE_PATH_PERMISSION_MAP: Record<string, Permission[]> = {
  shipments: ["VIEW_SHIPMENTS"], // employees also allowed to create shipments via other APIs
  releases: ["CREATE_RELEASE"],
  dashboard: ["VIEW_DASHBOARD"],
};

export default async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();

  // Read token server-side. Requires NEXTAUTH_SECRET to be set.
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // Not authenticated -> redirect to login
  if (!token) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Parse path parts: [institution, area, section, ...]
  const parts = req.nextUrl.pathname.split("/").filter(Boolean);
  const institutionParam = parts[0];
  const area = parts[1]; // 'admin' or 'public'
  const section = parts[2] || "dashboard";

  const role = String(token.role || "").toUpperCase();
  const tokenInstitution = token.institutionId ? String(token.institutionId) : "";

  // Superuser has unrestricted access regardless of path or institution.
  if (role === "SUPERUSER") {
    return NextResponse.next();
  }

  // Enforce institution scoping for everyone else: must stay in their own tenant.
  if (tokenInstitution && tokenInstitution !== institutionParam) {
    url.pathname = "/unauthorized";
    return NextResponse.redirect(url);
  }

  // ADMIN
  if (area === "admin") {
    // Only ADMIN and SUPERUSER can access admin routes.
    if (!["ADMIN", "SUPERUSER"].includes(role)) {
      url.pathname = "/unauthorized";
      return NextResponse.redirect(url);
    }

    // Check specific admin permission for this section.
    const candidates = ADMIN_PATH_PERMISSION_MAP[section];
    if (candidates && candidates.length > 0) {
      const allowed = candidates.some((p) => hasPermission(role as Role, p));
      if (!allowed) {
        url.pathname = "/unauthorized";
        return NextResponse.redirect(url);
      }
    }
  }

  // EMPLOYEE
  if (area === "public") {
    // EMPLOYEE, ADMIN, and SUPERUSER can access employee routes.
    if (!["EMPLOYEE", "ADMIN", "SUPERUSER"].includes(role)) {
      url.pathname = "/unauthorized";
      return NextResponse.redirect(url);
    }

    // Check specific employee permission for this section.
    const candidates = EMPLOYEE_PATH_PERMISSION_MAP[section];
    if (candidates && candidates.length > 0) {
      const allowed = candidates.some((p) => hasPermission(role as Role, p));
      if (!allowed) {
        url.pathname = "/unauthorized";
        return NextResponse.redirect(url);
      }
    }
  }

  return NextResponse.next();
}
