// src/__test__/middleware.test.ts
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import middleware, { config } from "@/middleware";

jest.mock("next-auth/jwt", () => ({
  getToken: jest.fn(),
}));

const mockGetToken = getToken as jest.MockedFunction<typeof getToken>;
type MiddlewareToken = NonNullable<Awaited<ReturnType<typeof getToken>>>;

function makeToken(
  role: "EMPLOYEE" | "ADMIN" | "SUPERUSER",
  institutionSlug?: string,
): MiddlewareToken {
  return {
    role,
    ...(institutionSlug !== undefined ? { institutionSlug } : {}),
  } as unknown as MiddlewareToken;
}

function makeRequest(pathname: string): NextRequest {
  return {
    nextUrl: {
      pathname,
      clone: () => new URL(pathname, "http://localhost"),
    },
  } as unknown as NextRequest;
}

describe("middleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("config.matcher", () => {
    it("is defined", () => {
      expect(config.matcher).toBeDefined();
      expect(config.matcher).toHaveLength(1);
    });

    it("matches actual admin route segments", () => {
      expect(config.matcher[0]).toBe("/:institution/(dashboard|organization|shipments)/:path*");
    });
  });

  it("redirects unauthenticated users to /login", async () => {
    mockGetToken.mockResolvedValue(null);

    const response = await middleware(makeRequest("/monarch-house/dashboard"));

    expect(response.headers.get("location")).toContain("/login");
  });

  it("allows EMPLOYEE users on permitted routes in their own institution", async () => {
    mockGetToken.mockResolvedValue(makeToken("EMPLOYEE", "monarch-house"));

    const response = await middleware(makeRequest("/monarch-house/shipments"));

    expect(response.headers.get("location")).toBeNull();
  });

  it("allows EMPLOYEE users on organization route (view only)", async () => {
    mockGetToken.mockResolvedValue(makeToken("EMPLOYEE", "monarch-house"));

    const response = await middleware(makeRequest("/monarch-house/organization"));

    expect(response.headers.get("location")).toBeNull();
  });

  it("allows ADMIN users on shipments route in their own institution", async () => {
    mockGetToken.mockResolvedValue(makeToken("ADMIN", "monarch-house"));

    const response = await middleware(makeRequest("/monarch-house/shipments"));

    expect(response.headers.get("location")).toBeNull();
  });

  it("allows ADMIN users on organization route", async () => {
    mockGetToken.mockResolvedValue(makeToken("ADMIN", "monarch-house"));

    const response = await middleware(makeRequest("/monarch-house/organization"));

    expect(response.headers.get("location")).toBeNull();
  });

  it("allows EMPLOYEE to access shipments/add (has CREATE_SHIPMENT)", async () => {
    mockGetToken.mockResolvedValue(makeToken("EMPLOYEE", "monarch-house"));

    const response = await middleware(makeRequest("/monarch-house/shipments/add"));

    expect(response.headers.get("location")).toBeNull();
  });

  it("blocks users from accessing another institution", async () => {
    mockGetToken.mockResolvedValue(makeToken("EMPLOYEE", "other-house"));

    const response = await middleware(makeRequest("/monarch-house/dashboard"));

    expect(response.headers.get("location")).toContain("/unauthorized");
  });

  it("allows SUPERUSER across institutions", async () => {
    mockGetToken.mockResolvedValue(makeToken("SUPERUSER", "other-house"));

    const response = await middleware(makeRequest("/monarch-house/dashboard"));

    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects to /unauthorized when non-superuser has no institution slug", async () => {
    mockGetToken.mockResolvedValue(makeToken("EMPLOYEE"));

    const response = await middleware(makeRequest("/monarch-house/dashboard"));

    expect(response.headers.get("location")).toContain("/unauthorized");
  });
});
