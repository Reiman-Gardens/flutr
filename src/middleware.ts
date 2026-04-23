import NextAuth, { type NextAuthRequest } from "next-auth";
import { NextResponse } from "next/server";
import authConfig from "@/auth.config";
import type { Role, Permission } from "@/lib/permissions";
import { hasPermission } from "@/lib/permissions";

// Build an Edge-safe NextAuth instance from the shared base config.
// Using `auth()` as the middleware wrapper avoids the v4-era `getToken()` pitfalls
// around JWE salt + cookie-name derivation in NextAuth v5.
const { auth } = NextAuth(authConfig);

// Middleware matcher: protects institution-scoped admin routes.
// Route groups like (tenant) do not appear in the URL; actual paths are
// /:institution/dashboard, /:institution/shipments, etc.
// Public routes (login, unauthorized, api, _next) bypass middleware entirely.
export const config = {
  matcher: ["/:institution/(dashboard|organization|shipments)/:path*"],
};

// Required permission to enter each top-level admin section.
const SECTION_PERMISSION_MAP: Record<string, Permission> = {
  dashboard: "VIEW_DASHBOARD",
  organization: "VIEW_ORGANIZATION",
  shipments: "VIEW_SHIPMENTS",
};

// Required permission for specific sub-paths within a section.
// Key format: "section/subsection"
const SUBSECTION_PERMISSION_MAP: Record<string, Permission> = {
  "shipments/add": "CREATE_SHIPMENT",
};

/**
 * Core authorization logic. Exported for unit tests (which construct `req` with a
 * pre-populated `req.auth` instead of exercising the NextAuth wrapper).
 */
export function handleAuthorizedRequest(req: NextAuthRequest): NextResponse {
  const url = req.nextUrl.clone();
  const session = req.auth;

  // Not authenticated -> redirect to login
  if (!session?.user) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Parse path parts: [institution, section, subsection?, ...]
  const parts = req.nextUrl.pathname.split("/").filter(Boolean);
  const institutionParam = parts[0];
  const section = parts[1] || "";
  const subsection = parts[2] || "";

  const role = String(session.user.role || "").toUpperCase();

  // Superuser has unrestricted access regardless of path or institution.
  if (role === "SUPERUSER") {
    return NextResponse.next();
  }

  // Non-superusers must be scoped to a tenant.
  if (!session.user.institutionSlug) {
    url.pathname = "/unauthorized";
    return NextResponse.redirect(url);
  }

  // Enforce institution scoping: users may only access their own tenant.
  if (session.user.institutionSlug !== institutionParam) {
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

export default auth(handleAuthorizedRequest);
