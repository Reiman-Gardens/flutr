import { NextRequest } from "next/server";

jest.mock("@/lib/services/tenant-suppliers", () => ({
  getTenantSuppliers: jest.fn(),
}));

import { getTenantSuppliers } from "@/lib/services/tenant-suppliers";
import { GET } from "@/app/api/tenant/suppliers/route";

const mockGetTenantSuppliers = getTenantSuppliers as jest.Mock;

const SLUG = "butterfly-house";

function makeGetRequest(slug?: string) {
  const headers: Record<string, string> = {};
  if (slug) headers["x-tenant-slug"] = slug;
  return new NextRequest("http://localhost/api/tenant/suppliers", { headers });
}

describe("Tenant Suppliers API", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("GET /api/tenant/suppliers", () => {
    it("returns 400 when x-tenant-slug header is missing", async () => {
      const response = (await GET(makeGetRequest()))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 401 for unauthenticated requests", async () => {
      mockGetTenantSuppliers.mockRejectedValueOnce(new Error("UNAUTHORIZED"));

      const response = (await GET(makeGetRequest(SLUG)))!;
      expect(response.status).toBe(401);
      expect((await response.json()).error.code).toBe("UNAUTHORIZED");
    });

    it("returns 403 for insufficient permission", async () => {
      mockGetTenantSuppliers.mockRejectedValueOnce(new Error("FORBIDDEN"));

      const response = (await GET(makeGetRequest(SLUG)))!;
      expect(response.status).toBe(403);
      expect((await response.json()).error.code).toBe("FORBIDDEN");
    });

    it("returns 404 when institution not found", async () => {
      mockGetTenantSuppliers.mockRejectedValueOnce(new Error("NOT_FOUND"));

      const response = (await GET(makeGetRequest(SLUG)))!;
      expect(response.status).toBe(404);
      expect((await response.json()).error.code).toBe("NOT_FOUND");
    });

    it("returns 200 with suppliers list and calls service with slug", async () => {
      mockGetTenantSuppliers.mockResolvedValueOnce([
        { id: 1, name: "Supplier One", code: "SUP-1", country: "CR", isActive: true },
      ]);

      const response = (await GET(makeGetRequest(SLUG)))!;
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(Array.isArray(body.suppliers)).toBe(true);
      expect(body.suppliers).toHaveLength(1);
      expect(body.suppliers[0].code).toBe("SUP-1");
      expect(mockGetTenantSuppliers).toHaveBeenCalledWith({ slug: SLUG });
    });
  });
});
