// src/__test__/middleware.test.ts
//
// The middleware imports `next-auth` (ESM) at module load. Jest can't parse that,
// so we mock it to return a pass-through `auth` wrapper. Tests exercise
// `handleAuthorizedRequest` directly with a pre-populated `req.auth`.
jest.mock("next-auth", () => {
  type ReqHandler = (req: unknown) => unknown;
  const NextAuth = () => ({
    auth: (handler: ReqHandler) => handler,
  });
  return { __esModule: true, default: NextAuth };
});

import type { NextAuthRequest } from "next-auth";
import { handleAuthorizedRequest, config } from "@/middleware";

type SessionUser = {
  role: "EMPLOYEE" | "ADMIN" | "SUPERUSER";
  institutionSlug?: string;
  id: string;
};

function makeRequest(pathname: string, user?: SessionUser): NextAuthRequest {
  return {
    nextUrl: {
      pathname,
      clone: () => new URL(pathname, "http://localhost"),
    },
    auth: user ? ({ user } as NextAuthRequest["auth"]) : null,
  } as unknown as NextAuthRequest;
}

function makeUser(role: "EMPLOYEE" | "ADMIN" | "SUPERUSER", institutionSlug?: string): SessionUser {
  return {
    id: "1",
    role,
    ...(institutionSlug !== undefined ? { institutionSlug } : {}),
  };
}

describe("middleware", () => {
  describe("config.matcher", () => {
    it("is defined", () => {
      expect(config.matcher).toBeDefined();
      expect(config.matcher).toHaveLength(1);
    });

    it("matches actual admin route segments", () => {
      expect(config.matcher[0]).toBe("/:institution/(dashboard|organization|shipments)/:path*");
    });
  });

  it("redirects unauthenticated users to /login", () => {
    const response = handleAuthorizedRequest(makeRequest("/monarch-house/dashboard"));

    expect(response.headers.get("location")).toContain("/login");
  });

  it("allows EMPLOYEE users on permitted routes in their own institution", () => {
    const response = handleAuthorizedRequest(
      makeRequest("/monarch-house/shipments", makeUser("EMPLOYEE", "monarch-house")),
    );

    expect(response.headers.get("location")).toBeNull();
  });

  it("allows EMPLOYEE users on organization route (view only)", () => {
    const response = handleAuthorizedRequest(
      makeRequest("/monarch-house/organization", makeUser("EMPLOYEE", "monarch-house")),
    );

    expect(response.headers.get("location")).toBeNull();
  });

  it("allows ADMIN users on shipments route in their own institution", () => {
    const response = handleAuthorizedRequest(
      makeRequest("/monarch-house/shipments", makeUser("ADMIN", "monarch-house")),
    );

    expect(response.headers.get("location")).toBeNull();
  });

  it("allows ADMIN users on organization route", () => {
    const response = handleAuthorizedRequest(
      makeRequest("/monarch-house/organization", makeUser("ADMIN", "monarch-house")),
    );

    expect(response.headers.get("location")).toBeNull();
  });

  it("allows EMPLOYEE to access shipments/add (has CREATE_SHIPMENT)", () => {
    const response = handleAuthorizedRequest(
      makeRequest("/monarch-house/shipments/add", makeUser("EMPLOYEE", "monarch-house")),
    );

    expect(response.headers.get("location")).toBeNull();
  });

  it("blocks users from accessing another institution", () => {
    const response = handleAuthorizedRequest(
      makeRequest("/monarch-house/dashboard", makeUser("EMPLOYEE", "other-house")),
    );

    expect(response.headers.get("location")).toContain("/unauthorized");
  });

  it("allows SUPERUSER across institutions", () => {
    const response = handleAuthorizedRequest(
      makeRequest("/monarch-house/dashboard", makeUser("SUPERUSER", "other-house")),
    );

    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects to /unauthorized when non-superuser has no institution slug", () => {
    const response = handleAuthorizedRequest(
      makeRequest("/monarch-house/dashboard", makeUser("EMPLOYEE")),
    );

    expect(response.headers.get("location")).toContain("/unauthorized");
  });
});
