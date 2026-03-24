// jest.mock("@/auth", () => ({
//   auth: jest.fn(),
// }));
// //Need to add employee to the mock to avoid "No session user" errors in middleware tests
// describe("middleware", () => {
//   describe("config.matcher", () => {
//     it("is defined", async () => {
//       const { config } = await import("@/middleware");
//       expect(config.matcher).toBeDefined();
//       expect(config.matcher).toHaveLength(1);
//     });

//     it("matches admin routes", async () => {
//       const { config } = await import("@/middleware");
//       const pattern = config.matcher[0];
//       expect(pattern).toBe("/:institution/(admin)/:path*");
//     });

//     it("does not match public routes by pattern structure", async () => {
//       const { config } = await import("@/middleware");
//       const pattern = config.matcher[0];
//       expect(pattern).not.toContain("(public)");
//     });
//   });
// });

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
  institutionId: string,
): MiddlewareToken {
  return {
    role,
    institutionId,
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

    it("matches both admin and employee routes", () => {
      expect(config.matcher[0]).toBe("/:institution/(admin|employee)/:path*");
    });
  });

  it("redirects unauthenticated users to /login", async () => {
    mockGetToken.mockResolvedValue(null);

    const response = await middleware(makeRequest("/monarch-house/employee/dashboard"));

    expect(response.headers.get("location")).toContain("/login");
  });

  it("allows EMPLOYEE users on employee routes in their own institution", async () => {
    mockGetToken.mockResolvedValue(makeToken("EMPLOYEE", "monarch-house"));

    const response = await middleware(makeRequest("/monarch-house/employee/dashboard"));

    expect(response.headers.get("location")).toBeNull();
  });

  it("blocks EMPLOYEE users from admin routes", async () => {
    mockGetToken.mockResolvedValue(makeToken("EMPLOYEE", "monarch-house"));

    const response = await middleware(makeRequest("/monarch-house/admin/shipments"));

    expect(response.headers.get("location")).toContain("/unauthorized");
  });

  it("allows ADMIN users on admin routes in their own institution", async () => {
    mockGetToken.mockResolvedValue(makeToken("ADMIN", "monarch-house"));

    const response = await middleware(makeRequest("/monarch-house/admin/shipments"));

    expect(response.headers.get("location")).toBeNull();
  });

  it("blocks users from accessing another institution", async () => {
    mockGetToken.mockResolvedValue(makeToken("EMPLOYEE", "other-house"));

    const response = await middleware(makeRequest("/monarch-house/employee/dashboard"));

    expect(response.headers.get("location")).toContain("/unauthorized");
  });

  it("allows SUPERUSER across institutions", async () => {
    mockGetToken.mockResolvedValue(makeToken("SUPERUSER", "other-house"));

    const response = await middleware(makeRequest("/monarch-house/admin/employees"));

    expect(response.headers.get("location")).toBeNull();
  });
});
