import { NextRequest } from "next/server";

jest.mock("@/lib/services/platform-institutions", () => ({
  getPlatformInstitutions: jest.fn(),
  createPlatformInstitution: jest.fn(),
  getPlatformInstitutionById: jest.fn(),
  updatePlatformInstitution: jest.fn(),
  deletePlatformInstitution: jest.fn(),
}));

import {
  getPlatformInstitutions,
  createPlatformInstitution,
  getPlatformInstitutionById,
  updatePlatformInstitution,
  deletePlatformInstitution,
} from "@/lib/services/platform-institutions";
import {
  GET as getInstitutions,
  POST as postInstitution,
} from "@/app/api/platform/institutions/route";
import {
  GET as getInstitutionById_route,
  PATCH as patchInstitutionById,
  DELETE as deleteInstitutionById,
} from "@/app/api/platform/institutions/[id]/route";

const mockGetPlatformInstitutions = getPlatformInstitutions as jest.Mock;
const mockCreatePlatformInstitution = createPlatformInstitution as jest.Mock;
const mockGetPlatformInstitutionById = getPlatformInstitutionById as jest.Mock;
const mockUpdatePlatformInstitution = updatePlatformInstitution as jest.Mock;
const mockDeletePlatformInstitution = deletePlatformInstitution as jest.Mock;

function makeGetRequest() {
  return new NextRequest("http://localhost/api/platform/institutions");
}

function makePostRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/platform/institutions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeGetByIdRequest(id: string) {
  return new NextRequest(`http://localhost/api/platform/institutions/${id}`);
}

function makePatchRequest(id: string, body: Record<string, unknown>) {
  return new NextRequest(`http://localhost/api/platform/institutions/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest(id: string) {
  return new NextRequest(`http://localhost/api/platform/institutions/${id}`, {
    method: "DELETE",
  });
}

function routeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

function validCreatePayload() {
  return {
    slug: "new-institution",
    name: "New Institution",
    street_address: "123 Main St",
    city: "Austin",
    state_province: "TX",
    postal_code: "78701",
    country: "US",
  };
}

describe("Platform Institutions API", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  // ──────────────────────────────────────────────
  // GET /api/platform/institutions
  // ──────────────────────────────────────────────

  describe("GET /api/platform/institutions", () => {
    it("returns 401 for unauthenticated requests", async () => {
      mockGetPlatformInstitutions.mockRejectedValueOnce(new Error("UNAUTHORIZED"));

      const response = (await getInstitutions(makeGetRequest()))!;
      expect(response.status).toBe(401);
      expect((await response.json()).error.code).toBe("UNAUTHORIZED");
    });

    it("returns 403 for non-SUPERUSER", async () => {
      mockGetPlatformInstitutions.mockRejectedValueOnce(new Error("FORBIDDEN"));

      const response = (await getInstitutions(makeGetRequest()))!;
      expect(response.status).toBe(403);
      expect((await response.json()).error.code).toBe("FORBIDDEN");
    });

    it("returns 200 with all institutions", async () => {
      mockGetPlatformInstitutions.mockResolvedValueOnce([
        { id: 1, slug: "inst-a", name: "Institution A" },
        { id: 2, slug: "inst-b", name: "Institution B" },
      ]);

      const response = (await getInstitutions(makeGetRequest()))!;
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.institutions).toHaveLength(2);
    });
  });

  // ──────────────────────────────────────────────
  // POST /api/platform/institutions
  // ──────────────────────────────────────────────

  describe("POST /api/platform/institutions", () => {
    it("returns 401 for unauthenticated requests", async () => {
      mockCreatePlatformInstitution.mockRejectedValueOnce(new Error("UNAUTHORIZED"));

      const response = (await postInstitution(makePostRequest(validCreatePayload())))!;
      expect(response.status).toBe(401);
    });

    it("returns 403 for non-SUPERUSER", async () => {
      mockCreatePlatformInstitution.mockRejectedValueOnce(new Error("FORBIDDEN"));

      const response = (await postInstitution(makePostRequest(validCreatePayload())))!;
      expect(response.status).toBe(403);
    });

    it("returns 201 on successful creation", async () => {
      mockCreatePlatformInstitution.mockResolvedValueOnce({
        id: 10,
        slug: "new-institution",
        name: "New Institution",
      });

      const response = (await postInstitution(makePostRequest(validCreatePayload())))!;
      expect(response.status).toBe(201);

      const body = await response.json();
      expect(body.institution.id).toBe(10);
      expect(body.institution.slug).toBe("new-institution");
      expect(mockCreatePlatformInstitution).toHaveBeenCalledWith(
        expect.objectContaining({ slug: "new-institution" }),
      );
    });

    it("returns 409 when slug already exists", async () => {
      mockCreatePlatformInstitution.mockRejectedValueOnce(new Error("CONFLICT"));

      const response = (await postInstitution(makePostRequest(validCreatePayload())))!;
      expect(response.status).toBe(409);
      expect((await response.json()).error.code).toBe("CONFLICT");
    });

    it("returns 400 for invalid body", async () => {
      const response = (await postInstitution(makePostRequest({ name: "Missing fields" })))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });
  });

  // ──────────────────────────────────────────────
  // GET /api/platform/institutions/[id]
  // ──────────────────────────────────────────────

  describe("GET /api/platform/institutions/[id]", () => {
    it("returns 401 for unauthenticated requests", async () => {
      mockGetPlatformInstitutionById.mockRejectedValueOnce(new Error("UNAUTHORIZED"));

      const response = (await getInstitutionById_route(
        makeGetByIdRequest("1"),
        routeContext("1"),
      ))!;
      expect(response.status).toBe(401);
    });

    it("returns 403 for non-SUPERUSER", async () => {
      mockGetPlatformInstitutionById.mockRejectedValueOnce(new Error("FORBIDDEN"));

      const response = (await getInstitutionById_route(
        makeGetByIdRequest("1"),
        routeContext("1"),
      ))!;
      expect(response.status).toBe(403);
    });

    it("returns 200 with institution", async () => {
      mockGetPlatformInstitutionById.mockResolvedValueOnce({
        id: 5,
        slug: "test-inst",
        name: "Test Institution",
      });

      const response = (await getInstitutionById_route(
        makeGetByIdRequest("5"),
        routeContext("5"),
      ))!;
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.institution.id).toBe(5);
    });

    it("returns 404 when institution not found", async () => {
      mockGetPlatformInstitutionById.mockResolvedValueOnce(null);

      const response = (await getInstitutionById_route(
        makeGetByIdRequest("999"),
        routeContext("999"),
      ))!;
      expect(response.status).toBe(404);
      expect((await response.json()).error.code).toBe("NOT_FOUND");
    });

    it("returns 400 for invalid id parameter", async () => {
      const response = (await getInstitutionById_route(
        makeGetByIdRequest("abc"),
        routeContext("abc"),
      ))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });
  });

  // ──────────────────────────────────────────────
  // PATCH /api/platform/institutions/[id]
  // ──────────────────────────────────────────────

  describe("PATCH /api/platform/institutions/[id]", () => {
    it("returns 401 for unauthenticated requests", async () => {
      mockUpdatePlatformInstitution.mockRejectedValueOnce(new Error("UNAUTHORIZED"));

      const response = (await patchInstitutionById(
        makePatchRequest("1", { name: "Updated" }),
        routeContext("1"),
      ))!;
      expect(response.status).toBe(401);
    });

    it("returns 403 for non-SUPERUSER", async () => {
      mockUpdatePlatformInstitution.mockRejectedValueOnce(new Error("FORBIDDEN"));

      const response = (await patchInstitutionById(
        makePatchRequest("1", { name: "Updated" }),
        routeContext("1"),
      ))!;
      expect(response.status).toBe(403);
    });

    it("returns 200 on successful update", async () => {
      mockUpdatePlatformInstitution.mockResolvedValueOnce({
        id: 1,
        name: "Updated Name",
      });

      const response = (await patchInstitutionById(
        makePatchRequest("1", { name: "Updated Name" }),
        routeContext("1"),
      ))!;
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.institution.name).toBe("Updated Name");
      expect(mockUpdatePlatformInstitution).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ name: "Updated Name" }),
      );
    });

    it("returns 409 when updated slug already exists", async () => {
      mockUpdatePlatformInstitution.mockRejectedValueOnce(new Error("CONFLICT"));

      const response = (await patchInstitutionById(
        makePatchRequest("1", { slug: "taken-slug" }),
        routeContext("1"),
      ))!;
      expect(response.status).toBe(409);
      expect((await response.json()).error.code).toBe("CONFLICT");
    });

    it("returns 404 when institution not found", async () => {
      mockUpdatePlatformInstitution.mockRejectedValueOnce(new Error("NOT_FOUND"));

      const response = (await patchInstitutionById(
        makePatchRequest("999", { name: "Updated" }),
        routeContext("999"),
      ))!;
      expect(response.status).toBe(404);
      expect((await response.json()).error.code).toBe("NOT_FOUND");
    });

    it("returns 400 for invalid id parameter", async () => {
      const response = (await patchInstitutionById(
        makePatchRequest("abc", { name: "Updated" }),
        routeContext("abc"),
      ))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });
  });

  // ──────────────────────────────────────────────
  // DELETE /api/platform/institutions/[id]
  // ──────────────────────────────────────────────

  describe("DELETE /api/platform/institutions/[id]", () => {
    it("returns 401 for unauthenticated requests", async () => {
      mockDeletePlatformInstitution.mockRejectedValueOnce(new Error("UNAUTHORIZED"));

      const response = (await deleteInstitutionById(makeDeleteRequest("1"), routeContext("1")))!;
      expect(response.status).toBe(401);
    });

    it("returns 403 for non-SUPERUSER", async () => {
      mockDeletePlatformInstitution.mockRejectedValueOnce(new Error("FORBIDDEN"));

      const response = (await deleteInstitutionById(makeDeleteRequest("1"), routeContext("1")))!;
      expect(response.status).toBe(403);
    });

    it("returns 200 for successful delete", async () => {
      mockDeletePlatformInstitution.mockResolvedValueOnce(undefined);

      const response = (await deleteInstitutionById(makeDeleteRequest("1"), routeContext("1")))!;
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.deleted).toBe(true);
      expect(mockDeletePlatformInstitution).toHaveBeenCalledWith(1);
    });

    it("returns 404 when institution not found", async () => {
      mockDeletePlatformInstitution.mockRejectedValueOnce(new Error("Institution not found"));

      const response = (await deleteInstitutionById(
        makeDeleteRequest("999"),
        routeContext("999"),
      ))!;
      expect(response.status).toBe(404);
      expect((await response.json()).error.code).toBe("NOT_FOUND");
    });

    it("returns 400 for invalid id parameter", async () => {
      const response = (await deleteInstitutionById(
        makeDeleteRequest("abc"),
        routeContext("abc"),
      ))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });
  });
});
