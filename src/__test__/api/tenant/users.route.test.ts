import { NextRequest } from "next/server";

jest.mock("@/lib/services/tenant-users", () => ({
  getTenantUsers: jest.fn(),
  getTenantUserById: jest.fn(),
  createTenantUser: jest.fn(),
  updateTenantUser: jest.fn(),
  deleteTenantUser: jest.fn(),
}));

import {
  getTenantUsers,
  getTenantUserById,
  createTenantUser,
  updateTenantUser,
  deleteTenantUser,
} from "@/lib/services/tenant-users";
import { GET as getUsers, POST as postUser } from "@/app/api/tenant/users/route";
import {
  DELETE as deleteUserById,
  GET as getUserByIdRoute,
  PATCH as patchUserById,
} from "@/app/api/tenant/users/[id]/route";

const mockGetTenantUsers = getTenantUsers as jest.Mock;
const mockGetTenantUserById = getTenantUserById as jest.Mock;
const mockCreateTenantUser = createTenantUser as jest.Mock;
const mockUpdateTenantUser = updateTenantUser as jest.Mock;
const mockDeleteTenantUser = deleteTenantUser as jest.Mock;

const SLUG = "butterfly-house";

function makeGetRequest(slug?: string) {
  const headers: Record<string, string> = {};
  if (slug) headers["x-tenant-slug"] = slug;
  return new NextRequest("http://localhost/api/tenant/users", { headers });
}

function makePostRequest(body: Record<string, unknown>, slug?: string) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (slug) headers["x-tenant-slug"] = slug;
  return new NextRequest("http://localhost/api/tenant/users", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function makeGetByIdRequest(id: string, slug?: string) {
  const headers: Record<string, string> = {};
  if (slug) headers["x-tenant-slug"] = slug;
  return new NextRequest(`http://localhost/api/tenant/users/${id}`, { headers });
}

function makePatchRequest(id: string, body: Record<string, unknown>, slug?: string) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (slug) headers["x-tenant-slug"] = slug;
  return new NextRequest(`http://localhost/api/tenant/users/${id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest(id: string, slug?: string) {
  const headers: Record<string, string> = {};
  if (slug) headers["x-tenant-slug"] = slug;
  return new NextRequest(`http://localhost/api/tenant/users/${id}`, { method: "DELETE", headers });
}

function routeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

function validCreatePayload() {
  return {
    name: "Jane Admin",
    email: "jane@example.com",
    password: "password123",
    role: "EMPLOYEE",
  };
}

const sampleUser = {
  id: 2,
  institutionId: 1,
  name: "Jane Admin",
  email: "jane@example.com",
  role: "EMPLOYEE",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("Tenant Users API", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  // -----------------------------------------------------------------------
  // GET /api/tenant/users
  // -----------------------------------------------------------------------

  describe("GET /api/tenant/users", () => {
    it("returns 400 when x-tenant-slug header is missing", async () => {
      const response = (await getUsers(makeGetRequest()))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 401 for unauthenticated requests", async () => {
      mockGetTenantUsers.mockRejectedValueOnce(new Error("UNAUTHORIZED"));

      const response = (await getUsers(makeGetRequest(SLUG)))!;
      expect(response.status).toBe(401);
      expect((await response.json()).error.code).toBe("UNAUTHORIZED");
    });

    it("returns 403 for insufficient permission", async () => {
      mockGetTenantUsers.mockRejectedValueOnce(new Error("FORBIDDEN"));

      const response = (await getUsers(makeGetRequest(SLUG)))!;
      expect(response.status).toBe(403);
      expect((await response.json()).error.code).toBe("FORBIDDEN");
    });

    it("returns 200 with users list and calls service with slug", async () => {
      mockGetTenantUsers.mockResolvedValueOnce([sampleUser]);

      const response = (await getUsers(makeGetRequest(SLUG)))!;
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.users).toHaveLength(1);
      expect(body.users[0].email).toBe("jane@example.com");
      expect(mockGetTenantUsers).toHaveBeenCalledWith({ slug: SLUG });
    });
  });

  // -----------------------------------------------------------------------
  // POST /api/tenant/users
  // -----------------------------------------------------------------------

  describe("POST /api/tenant/users", () => {
    it("returns 400 when x-tenant-slug header is missing", async () => {
      const response = (await postUser(makePostRequest(validCreatePayload())))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 401 for unauthenticated requests", async () => {
      mockCreateTenantUser.mockRejectedValueOnce(new Error("UNAUTHORIZED"));

      const response = (await postUser(makePostRequest(validCreatePayload(), SLUG)))!;
      expect(response.status).toBe(401);
      expect((await response.json()).error.code).toBe("UNAUTHORIZED");
    });

    it("returns 403 for insufficient permission", async () => {
      mockCreateTenantUser.mockRejectedValueOnce(new Error("FORBIDDEN"));

      const response = (await postUser(makePostRequest(validCreatePayload(), SLUG)))!;
      expect(response.status).toBe(403);
      expect((await response.json()).error.code).toBe("FORBIDDEN");
    });

    it("returns 400 for invalid request body", async () => {
      const response = (await postUser(makePostRequest({ name: "Only name" }, SLUG)))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 400 when body contains unknown fields (institutionId rejected by .strict())", async () => {
      const response = (await postUser(
        makePostRequest({ ...validCreatePayload(), institutionId: 1 }, SLUG),
      ))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 403 when role assignment is not allowed", async () => {
      mockCreateTenantUser.mockRejectedValueOnce(new Error("FORBIDDEN"));

      const response = (await postUser(
        makePostRequest({ ...validCreatePayload(), role: "SUPERUSER" }, SLUG),
      ))!;
      expect(response.status).toBe(403);
    });

    it("returns 409 when email already exists", async () => {
      mockCreateTenantUser.mockRejectedValueOnce({ code: "23505" });

      const response = (await postUser(makePostRequest(validCreatePayload(), SLUG)))!;
      expect(response.status).toBe(409);
      expect((await response.json()).error.code).toBe("CONFLICT");
    });

    it("returns 200 on successful creation and calls service with slug", async () => {
      mockCreateTenantUser.mockResolvedValueOnce(sampleUser);

      const response = (await postUser(makePostRequest(validCreatePayload(), SLUG)))!;
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.user.id).toBe(2);
      expect(body.user.email).toBe("jane@example.com");
      expect(mockCreateTenantUser).toHaveBeenCalledWith(
        expect.objectContaining({ slug: SLUG, email: "jane@example.com" }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // GET /api/tenant/users/[id]
  // -----------------------------------------------------------------------

  describe("GET /api/tenant/users/[id]", () => {
    it("returns 400 when x-tenant-slug header is missing", async () => {
      const response = (await getUserByIdRoute(makeGetByIdRequest("2"), routeContext("2")))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 400 for non-numeric id", async () => {
      const response = (await getUserByIdRoute(
        makeGetByIdRequest("abc", SLUG),
        routeContext("abc"),
      ))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 401 for unauthenticated requests", async () => {
      mockGetTenantUserById.mockRejectedValueOnce(new Error("UNAUTHORIZED"));

      const response = (await getUserByIdRoute(makeGetByIdRequest("2", SLUG), routeContext("2")))!;
      expect(response.status).toBe(401);
      expect((await response.json()).error.code).toBe("UNAUTHORIZED");
    });

    it("returns 403 when actor cannot access target", async () => {
      mockGetTenantUserById.mockRejectedValueOnce(new Error("FORBIDDEN"));

      const response = (await getUserByIdRoute(makeGetByIdRequest("2", SLUG), routeContext("2")))!;
      expect(response.status).toBe(403);
      expect((await response.json()).error.code).toBe("FORBIDDEN");
    });

    it("returns 404 when user is not found", async () => {
      mockGetTenantUserById.mockResolvedValueOnce(null);

      const response = (await getUserByIdRoute(
        makeGetByIdRequest("999", SLUG),
        routeContext("999"),
      ))!;
      expect(response.status).toBe(404);
      expect((await response.json()).error.code).toBe("NOT_FOUND");
    });

    it("returns 404 for user outside tenant scope (security: no 403 information leak)", async () => {
      mockGetTenantUserById.mockResolvedValueOnce(null);

      const response = (await getUserByIdRoute(makeGetByIdRequest("2", SLUG), routeContext("2")))!;
      expect(response.status).toBe(404);
    });

    it("returns 200 with user and calls service with slug", async () => {
      mockGetTenantUserById.mockResolvedValueOnce(sampleUser);

      const response = (await getUserByIdRoute(makeGetByIdRequest("2", SLUG), routeContext("2")))!;
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.user.id).toBe(2);
      expect(body.user.email).toBe("jane@example.com");
      expect(mockGetTenantUserById).toHaveBeenCalledWith({ userId: 2, slug: SLUG });
    });
  });

  // -----------------------------------------------------------------------
  // PATCH /api/tenant/users/[id]
  // -----------------------------------------------------------------------

  describe("PATCH /api/tenant/users/[id]", () => {
    it("returns 400 when x-tenant-slug header is missing", async () => {
      const response = (await patchUserById(
        makePatchRequest("2", { name: "Updated" }),
        routeContext("2"),
      ))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 400 for non-numeric id", async () => {
      const response = (await patchUserById(
        makePatchRequest("abc", { name: "Updated" }, SLUG),
        routeContext("abc"),
      ))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 400 for empty body (no updatable fields)", async () => {
      const response = (await patchUserById(makePatchRequest("2", {}, SLUG), routeContext("2")))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 400 when body contains unknown fields (institutionId rejected by .strict())", async () => {
      const response = (await patchUserById(
        makePatchRequest("2", { name: "Updated", institutionId: 1 }, SLUG),
        routeContext("2"),
      ))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 401 for unauthenticated requests", async () => {
      mockUpdateTenantUser.mockRejectedValueOnce(new Error("UNAUTHORIZED"));

      const response = (await patchUserById(
        makePatchRequest("2", { name: "Updated" }, SLUG),
        routeContext("2"),
      ))!;
      expect(response.status).toBe(401);
      expect((await response.json()).error.code).toBe("UNAUTHORIZED");
    });

    it("returns 403 for insufficient permission", async () => {
      mockUpdateTenantUser.mockRejectedValueOnce(new Error("FORBIDDEN"));

      const response = (await patchUserById(
        makePatchRequest("2", { name: "Updated" }, SLUG),
        routeContext("2"),
      ))!;
      expect(response.status).toBe(403);
      expect((await response.json()).error.code).toBe("FORBIDDEN");
    });

    it("returns 404 when user is not found", async () => {
      mockUpdateTenantUser.mockResolvedValueOnce(null);

      const response = (await patchUserById(
        makePatchRequest("999", { name: "Updated" }, SLUG),
        routeContext("999"),
      ))!;
      expect(response.status).toBe(404);
      expect((await response.json()).error.code).toBe("NOT_FOUND");
    });

    it("returns 409 when email already exists", async () => {
      mockUpdateTenantUser.mockRejectedValueOnce({ code: "23505" });

      const response = (await patchUserById(
        makePatchRequest("2", { email: "taken@example.com" }, SLUG),
        routeContext("2"),
      ))!;
      expect(response.status).toBe(409);
      expect((await response.json()).error.code).toBe("CONFLICT");
    });

    it("returns 200 on successful update and calls service with slug", async () => {
      const updated = { ...sampleUser, name: "Updated Name" };
      mockUpdateTenantUser.mockResolvedValueOnce(updated);

      const response = (await patchUserById(
        makePatchRequest("2", { name: "Updated Name" }, SLUG),
        routeContext("2"),
      ))!;
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.user.name).toBe("Updated Name");
      expect(mockUpdateTenantUser).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 2, slug: SLUG, name: "Updated Name" }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // DELETE /api/tenant/users/[id]
  // -----------------------------------------------------------------------

  describe("DELETE /api/tenant/users/[id]", () => {
    it("returns 400 when x-tenant-slug header is missing", async () => {
      const response = (await deleteUserById(makeDeleteRequest("2"), routeContext("2")))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 400 for non-numeric id", async () => {
      const response = (await deleteUserById(makeDeleteRequest("abc", SLUG), routeContext("abc")))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 401 for unauthenticated requests", async () => {
      mockDeleteTenantUser.mockRejectedValueOnce(new Error("UNAUTHORIZED"));

      const response = (await deleteUserById(makeDeleteRequest("2", SLUG), routeContext("2")))!;
      expect(response.status).toBe(401);
      expect((await response.json()).error.code).toBe("UNAUTHORIZED");
    });

    it("returns 403 when delete is not allowed", async () => {
      mockDeleteTenantUser.mockRejectedValueOnce(new Error("FORBIDDEN"));

      const response = (await deleteUserById(makeDeleteRequest("2", SLUG), routeContext("2")))!;
      expect(response.status).toBe(403);
      expect((await response.json()).error.code).toBe("FORBIDDEN");
    });

    it("returns 404 when user is not found", async () => {
      mockDeleteTenantUser.mockResolvedValueOnce(null);

      const response = (await deleteUserById(makeDeleteRequest("999", SLUG), routeContext("999")))!;
      expect(response.status).toBe(404);
      expect((await response.json()).error.code).toBe("NOT_FOUND");
    });

    it("returns 200 on successful delete and calls service with slug", async () => {
      mockDeleteTenantUser.mockResolvedValueOnce(true);

      const response = (await deleteUserById(makeDeleteRequest("2", SLUG), routeContext("2")))!;
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.deleted).toBe(true);
      expect(mockDeleteTenantUser).toHaveBeenCalledWith({ userId: 2, slug: SLUG });
    });
  });
});
