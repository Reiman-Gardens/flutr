import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Role, Permission } from "@/lib/permissions";
import { hasPermission } from "@/lib/permissions";

// Middleware matcher: protects institution-scoped admin routes.
// Route groups like (tenant) do not appear in the URL; actual paths are
// /:institution/dashboard, /:institution/shipments, etc.
// Public routes (login, unauthorized, api, _next) bypass middleware entirely.
export const config = {
  matcher: ["/:institution/(dashboard|organization|shipments|releases)/:path*"],
};

// Required permission to enter each top-level admin section.
const SECTION_PERMISSION_MAP: Record<string, Permission> = {
  dashboard: "VIEW_DASHBOARD",
  organization: "VIEW_ORGANIZATION",
  shipments: "VIEW_SHIPMENTS",
  releases: "VIEW_RELEASES",
};

// Required permission for specific sub-paths within a section.
// Key format: "section/subsection"
const SUBSECTION_PERMISSION_MAP: Record<string, Permission> = {
  "shipments/add": "CREATE_SHIPMENT",
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

  // Parse path parts: [institution, section, subsection?, ...]
  const parts = req.nextUrl.pathname.split("/").filter(Boolean);
  const institutionParam = parts[0];
  const section = parts[1] || "";
  const subsection = parts[2] || "";

  const role = String(token.role || "").toUpperCase();

  // Superuser has unrestricted access regardless of path or institution.
  if (role === "SUPERUSER") {
    return NextResponse.next();
  }

  // Non-superusers must be scoped to a tenant.
  if (!token.institutionSlug) {
    url.pathname = "/unauthorized";
    return NextResponse.redirect(url);
  }

  // Enforce institution scoping: users may only access their own tenant.
  if (token.institutionSlug !== institutionParam) {
    url.pathname = "/unauthorized";
    return NextResponse.redirect(url);
  }

  // All authenticated roles (ADMIN, EMPLOYEE) may access admin routes, subject to
  // per-section and per-subsection permission checks.
  if (!["ADMIN", "EMPLOYEE", "SUPERUSER"].includes(role)) {
    url.pathname = "/unauthorized";
    return NextResponse.redirect(url);
  }

  // Check subsection-level permission first (e.g. shipments/add -> CREATE_SHIPMENT).
  if (subsection) {
    const subsectionKey = `${section}/${subsection}`;
    if (subsectionKey in SUBSECTION_PERMISSION_MAP) {
      const required = SUBSECTION_PERMISSION_MAP[subsectionKey];
      if (!hasPermission(role as Role, required)) {
        url.pathname = "/unauthorized";
        return NextResponse.redirect(url);
      }
    }
  }

  // Check section-level permission (e.g. shipments -> VIEW_SHIPMENTS).
  const sectionPermission = SECTION_PERMISSION_MAP[section];
  if (sectionPermission && !hasPermission(role as Role, sectionPermission)) {
    url.pathname = "/unauthorized";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
