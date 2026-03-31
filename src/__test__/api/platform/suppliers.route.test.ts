import { NextRequest } from "next/server";

jest.mock("@/lib/services/platform-suppliers", () => ({
  getPlatformSuppliers: jest.fn(),
  createPlatformSupplier: jest.fn(),
  getPlatformSupplierById: jest.fn(),
  updatePlatformSupplier: jest.fn(),
  deletePlatformSupplier: jest.fn(),
  SUPPLIER_ERRORS: {
    REFERENCED_BY_SHIPMENTS: "Supplier is referenced by existing shipments",
  },
}));

import {
  getPlatformSuppliers,
  createPlatformSupplier,
  getPlatformSupplierById,
  updatePlatformSupplier,
  deletePlatformSupplier,
  SUPPLIER_ERRORS,
} from "@/lib/services/platform-suppliers";
import { GET as getSuppliers, POST as postSupplier } from "@/app/api/platform/suppliers/route";
import {
  GET as getSupplierById_route,
  PATCH as patchSupplierById,
  DELETE as deleteSupplierById,
} from "@/app/api/platform/suppliers/[id]/route";

const mockGetPlatformSuppliers = getPlatformSuppliers as jest.Mock;
const mockCreatePlatformSupplier = createPlatformSupplier as jest.Mock;
const mockGetPlatformSupplierById = getPlatformSupplierById as jest.Mock;
const mockUpdatePlatformSupplier = updatePlatformSupplier as jest.Mock;
const mockDeletePlatformSupplier = deletePlatformSupplier as jest.Mock;

function makeGetRequest(query: Record<string, string> = {}) {
  const params = new URLSearchParams(query);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return new NextRequest(`http://localhost/api/platform/suppliers${suffix}`);
}

function makePostRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/platform/suppliers", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeGetByIdRequest(id: string) {
  return new NextRequest(`http://localhost/api/platform/suppliers/${id}`);
}

function makePatchRequest(id: string, body: Record<string, unknown>) {
  return new NextRequest(`http://localhost/api/platform/suppliers/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest(id: string) {
  return new NextRequest(`http://localhost/api/platform/suppliers/${id}`, {
    method: "DELETE",
  });
}

function routeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

function validCreatePayload() {
  return {
    name: "Costa Rica Butterflies",
    code: "CRB",
    country: "CR",
    institutionId: 1,
  };
}

const sampleSupplier = {
  id: 1,
  institutionId: 1,
  name: "Costa Rica Butterflies",
  code: "CRB",
  country: "CR",
  websiteUrl: null,
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("Platform Suppliers API", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  // ──────────────────────────────────────────────
  // GET /api/platform/suppliers
  // ──────────────────────────────────────────────

  describe("GET /api/platform/suppliers", () => {
    it("returns 401 for unauthenticated requests", async () => {
      mockGetPlatformSuppliers.mockRejectedValueOnce(new Error("UNAUTHORIZED"));

      const response = (await getSuppliers(makeGetRequest()))!;
      expect(response.status).toBe(401);
      expect((await response.json()).error.code).toBe("UNAUTHORIZED");
    });

    it("returns 403 for non-SUPERUSER", async () => {
      mockGetPlatformSuppliers.mockRejectedValueOnce(new Error("FORBIDDEN"));

      const response = (await getSuppliers(makeGetRequest()))!;
      expect(response.status).toBe(403);
      expect((await response.json()).error.code).toBe("FORBIDDEN");
    });

    it("returns 200 with all suppliers", async () => {
      mockGetPlatformSuppliers.mockResolvedValueOnce([sampleSupplier]);

      const response = (await getSuppliers(makeGetRequest()))!;
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.suppliers).toHaveLength(1);
      expect(body.suppliers[0].code).toBe("CRB");
      expect(mockGetPlatformSuppliers).toHaveBeenCalledWith(undefined);
    });

    it("filters by institutionId when provided", async () => {
      mockGetPlatformSuppliers.mockResolvedValueOnce([]);

      const response = (await getSuppliers(makeGetRequest({ institutionId: "2" })))!;
      expect(response.status).toBe(200);
      expect(mockGetPlatformSuppliers).toHaveBeenCalledWith(2);
    });

    it("returns 400 for invalid institutionId query", async () => {
      const response = (await getSuppliers(makeGetRequest({ institutionId: "abc" })))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });
  });

  // ──────────────────────────────────────────────
  // POST /api/platform/suppliers
  // ──────────────────────────────────────────────

  describe("POST /api/platform/suppliers", () => {
    it("returns 401 for unauthenticated requests", async () => {
      mockCreatePlatformSupplier.mockRejectedValueOnce(new Error("UNAUTHORIZED"));

      const response = (await postSupplier(makePostRequest(validCreatePayload())))!;
      expect(response.status).toBe(401);
    });

    it("returns 403 for non-SUPERUSER", async () => {
      mockCreatePlatformSupplier.mockRejectedValueOnce(new Error("FORBIDDEN"));

      const response = (await postSupplier(makePostRequest(validCreatePayload())))!;
      expect(response.status).toBe(403);
    });

    it("returns 201 on successful creation", async () => {
      mockCreatePlatformSupplier.mockResolvedValueOnce(sampleSupplier);

      const response = (await postSupplier(makePostRequest(validCreatePayload())))!;
      expect(response.status).toBe(201);

      const body = await response.json();
      expect(body.supplier.code).toBe("CRB");
      expect(mockCreatePlatformSupplier).toHaveBeenCalledWith(
        expect.objectContaining({ code: "CRB" }),
      );
    });

    it("returns 409 when supplier code already exists", async () => {
      mockCreatePlatformSupplier.mockRejectedValueOnce(new Error("CONFLICT"));

      const response = (await postSupplier(makePostRequest(validCreatePayload())))!;
      expect(response.status).toBe(409);
      expect((await response.json()).error.code).toBe("CONFLICT");
    });

    it("returns 400 for missing required fields", async () => {
      const response = (await postSupplier(makePostRequest({ name: "Only name" })))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 403 when SUPERUSER omits institutionId", async () => {
      mockCreatePlatformSupplier.mockRejectedValueOnce(new Error("FORBIDDEN"));

      const payload = { name: "Test", code: "TST", country: "US" };
      const response = (await postSupplier(makePostRequest(payload)))!;
      expect(response.status).toBe(403);
      expect((await response.json()).error.code).toBe("FORBIDDEN");
    });
  });

  // ──────────────────────────────────────────────
  // GET /api/platform/suppliers/[id]
  // ──────────────────────────────────────────────

  describe("GET /api/platform/suppliers/[id]", () => {
    it("returns 401 for unauthenticated requests", async () => {
      mockGetPlatformSupplierById.mockRejectedValueOnce(new Error("UNAUTHORIZED"));

      const response = (await getSupplierById_route(makeGetByIdRequest("1"), routeContext("1")))!;
      expect(response.status).toBe(401);
    });

    it("returns 403 for non-SUPERUSER", async () => {
      mockGetPlatformSupplierById.mockRejectedValueOnce(new Error("FORBIDDEN"));

      const response = (await getSupplierById_route(makeGetByIdRequest("1"), routeContext("1")))!;
      expect(response.status).toBe(403);
    });

    it("returns 200 with supplier", async () => {
      mockGetPlatformSupplierById.mockResolvedValueOnce(sampleSupplier);

      const response = (await getSupplierById_route(makeGetByIdRequest("1"), routeContext("1")))!;
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.supplier.id).toBe(1);
      expect(body.supplier.code).toBe("CRB");
    });

    it("returns 404 when supplier not found", async () => {
      mockGetPlatformSupplierById.mockResolvedValueOnce(null);

      const response = (await getSupplierById_route(
        makeGetByIdRequest("999"),
        routeContext("999"),
      ))!;
      expect(response.status).toBe(404);
      expect((await response.json()).error.code).toBe("NOT_FOUND");
    });

    it("returns 400 for invalid id parameter", async () => {
      const response = (await getSupplierById_route(
        makeGetByIdRequest("abc"),
        routeContext("abc"),
      ))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });
  });

  // ──────────────────────────────────────────────
  // PATCH /api/platform/suppliers/[id]
  // ──────────────────────────────────────────────

  describe("PATCH /api/platform/suppliers/[id]", () => {
    it("returns 401 for unauthenticated requests", async () => {
      mockUpdatePlatformSupplier.mockRejectedValueOnce(new Error("UNAUTHORIZED"));

      const response = (await patchSupplierById(
        makePatchRequest("1", { name: "Updated" }),
        routeContext("1"),
      ))!;
      expect(response.status).toBe(401);
    });

    it("returns 403 for non-SUPERUSER", async () => {
      mockUpdatePlatformSupplier.mockRejectedValueOnce(new Error("FORBIDDEN"));

      const response = (await patchSupplierById(
        makePatchRequest("1", { name: "Updated" }),
        routeContext("1"),
      ))!;
      expect(response.status).toBe(403);
    });

    it("returns 200 on successful update", async () => {
      mockUpdatePlatformSupplier.mockResolvedValueOnce({ ...sampleSupplier, name: "Updated Name" });

      const response = (await patchSupplierById(
        makePatchRequest("1", { name: "Updated Name" }),
        routeContext("1"),
      ))!;
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.supplier.name).toBe("Updated Name");
    });

    it("returns 404 when supplier not found", async () => {
      mockUpdatePlatformSupplier.mockRejectedValueOnce(new Error("NOT_FOUND"));

      const response = (await patchSupplierById(
        makePatchRequest("999", { name: "Updated" }),
        routeContext("999"),
      ))!;
      expect(response.status).toBe(404);
    });

    it("returns 409 when updated code already exists", async () => {
      mockUpdatePlatformSupplier.mockRejectedValueOnce(new Error("CONFLICT"));

      const response = (await patchSupplierById(
        makePatchRequest("1", { code: "TAKEN" }),
        routeContext("1"),
      ))!;
      expect(response.status).toBe(409);
      expect((await response.json()).error.code).toBe("CONFLICT");
    });

    it("returns 409 when code change violates FK constraint", async () => {
      mockUpdatePlatformSupplier.mockRejectedValueOnce(
        new Error(SUPPLIER_ERRORS.REFERENCED_BY_SHIPMENTS),
      );

      const response = (await patchSupplierById(
        makePatchRequest("1", { code: "NEW-CODE" }),
        routeContext("1"),
      ))!;
      expect(response.status).toBe(409);
      expect((await response.json()).error.code).toBe("CONFLICT");
    });

    it("returns 400 when no fields are provided", async () => {
      const response = (await patchSupplierById(makePatchRequest("1", {}), routeContext("1")))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 400 for invalid id parameter", async () => {
      const response = (await patchSupplierById(
        makePatchRequest("abc", { name: "Updated" }),
        routeContext("abc"),
      ))!;
      expect(response.status).toBe(400);
    });
  });

  // ──────────────────────────────────────────────
  // DELETE /api/platform/suppliers/[id]
  // ──────────────────────────────────────────────

  describe("DELETE /api/platform/suppliers/[id]", () => {
    it("returns 401 for unauthenticated requests", async () => {
      mockDeletePlatformSupplier.mockRejectedValueOnce(new Error("UNAUTHORIZED"));

      const response = (await deleteSupplierById(makeDeleteRequest("1"), routeContext("1")))!;
      expect(response.status).toBe(401);
    });

    it("returns 403 for non-SUPERUSER", async () => {
      mockDeletePlatformSupplier.mockRejectedValueOnce(new Error("FORBIDDEN"));

      const response = (await deleteSupplierById(makeDeleteRequest("1"), routeContext("1")))!;
      expect(response.status).toBe(403);
    });

    it("returns 200 on successful delete", async () => {
      mockDeletePlatformSupplier.mockResolvedValueOnce(undefined);

      const response = (await deleteSupplierById(makeDeleteRequest("1"), routeContext("1")))!;
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.deleted).toBe(true);
      expect(mockDeletePlatformSupplier).toHaveBeenCalledWith(1);
    });

    it("returns 404 when supplier not found", async () => {
      mockDeletePlatformSupplier.mockRejectedValueOnce(new Error("NOT_FOUND"));

      const response = (await deleteSupplierById(makeDeleteRequest("999"), routeContext("999")))!;
      expect(response.status).toBe(404);
    });

    it("returns 409 when supplier is referenced by shipments", async () => {
      mockDeletePlatformSupplier.mockRejectedValueOnce(
        new Error(SUPPLIER_ERRORS.REFERENCED_BY_SHIPMENTS),
      );

      const response = (await deleteSupplierById(makeDeleteRequest("1"), routeContext("1")))!;
      expect(response.status).toBe(409);
      expect((await response.json()).error.code).toBe("CONFLICT");
    });

    it("returns 400 for invalid id parameter", async () => {
      const response = (await deleteSupplierById(makeDeleteRequest("abc"), routeContext("abc")))!;
      expect(response.status).toBe(400);
    });
  });
});
