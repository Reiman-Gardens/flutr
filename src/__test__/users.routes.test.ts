import { GET as getUsers, POST as postUsers } from "@/app/api/users/route";
import {
  GET as getUser,
  PATCH as patchUser,
  DELETE as deleteUser,
} from "@/app/api/users/[id]/route";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock("bcrypt", () => ({
  hash: jest.fn().mockResolvedValue("hashed-password"),
}));

const authMock = auth as jest.Mock;

type SelectResult = Record<string, unknown>[];

function makeSelect(result: SelectResult) {
  return {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(result),
    then: (resolve: (value: SelectResult) => void, reject: (reason?: unknown) => void) =>
      Promise.resolve(result).then(resolve, reject),
  };
}

function makeInsert(result: Record<string, unknown>[]) {
  return {
    values: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue(result),
  };
}

function makeUpdate() {
  return {
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockResolvedValue(undefined),
  };
}

function makeDelete(result: Record<string, unknown>[]) {
  return {
    where: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue(result),
  };
}

function jsonRequest(url: string, method: string, body: unknown) {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Users API routes", () => {
  beforeEach(() => {
    authMock.mockReset();
    (db.select as jest.Mock).mockReset();
    (db.insert as jest.Mock).mockReset();
    (db.update as jest.Mock).mockReset();
    (db.delete as jest.Mock).mockReset();
    (logger.error as jest.Mock).mockReset();
  });

  describe("POST /api/users", () => {
    it("returns 401 when unauthenticated", async () => {
      authMock.mockResolvedValue(null);

      const response = await postUsers(
        jsonRequest("http://localhost/api/users", "POST", {
          name: "Ada",
          email: "ada@example.com",
          password: "password123",
          role: "EMPLOYEE",
        }),
      );

      expect(response.status).toBe(401);
    });

    it("returns 403 when role assignment is forbidden", async () => {
      authMock.mockResolvedValue({
        user: { id: "10", role: "ADMIN", institutionId: 1 },
      });

      const response = await postUsers(
        jsonRequest("http://localhost/api/users", "POST", {
          name: "Ada",
          email: "ada@example.com",
          password: "password123",
          role: "ADMIN",
          institutionId: 1,
        }),
      );

      expect(response.status).toBe(403);
    });

    it("returns 400 for invalid JSON payload", async () => {
      authMock.mockResolvedValue({ user: { id: "10", role: "ADMIN", institutionId: 1 } });

      const response = await postUsers(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{",
        }),
      );

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({ error: "Invalid JSON payload" });
    });

    it("returns 400 when payload includes unknown fields", async () => {
      authMock.mockResolvedValue({ user: { id: "10", role: "ADMIN", institutionId: 1 } });

      const response = await postUsers(
        jsonRequest("http://localhost/api/users", "POST", {
          name: "Ada",
          email: "ada@example.com",
          password: "password123",
          role: "EMPLOYEE",
          institutionId: 1,
          extraField: "not-allowed",
        }),
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Invalid request");
      expect(Array.isArray(body.details)).toBe(true);
    });

    it("allows org-superuser to create admin", async () => {
      authMock.mockResolvedValue({
        user: { id: "11", role: "ORG_SUPERUSER", institutionId: 1 },
      });

      // ensureTenantExists + email uniqueness check (no existing user)
      (db.select as jest.Mock)
        .mockImplementationOnce(() => makeSelect([{ id: 1 }]))
        .mockImplementationOnce(() => makeSelect([]));
      (db.insert as jest.Mock).mockImplementationOnce(() =>
        makeInsert([
          {
            id: 99,
            name: "Ada",
            email: "ada@example.com",
            role: "ADMIN",
            institutionId: 1,
          },
        ]),
      );

      const response = await postUsers(
        jsonRequest("http://localhost/api/users", "POST", {
          name: "Ada",
          email: "ada@example.com",
          password: "password123",
          role: "ADMIN",
          institutionId: 1,
        }),
      );

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body).toEqual({
        id: 99,
        name: "Ada",
        email: "ada@example.com",
        role: "ADMIN",
        institutionId: 1,
      });
    });

    it("returns 409 when email is already in use", async () => {
      authMock.mockResolvedValue({
        user: { id: "11", role: "ORG_SUPERUSER", institutionId: 1 },
      });

      // ensureTenantExists succeeds, email check finds existing user
      (db.select as jest.Mock)
        .mockImplementationOnce(() => makeSelect([{ id: 1 }]))
        .mockImplementationOnce(() => makeSelect([{ id: 42 }]));

      const response = await postUsers(
        jsonRequest("http://localhost/api/users", "POST", {
          name: "Ada",
          email: "ada@example.com",
          password: "password123",
          role: "ADMIN",
          institutionId: 1,
        }),
      );

      expect(response.status).toBe(409);
      await expect(response.json()).resolves.toEqual({ error: "Email already in use" });
    });
  });

  describe("GET /api/users", () => {
    it("returns 401 when unauthenticated", async () => {
      authMock.mockResolvedValue(null);

      const response = await getUsers(new Request("http://localhost/api/users"));

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    });

    it("returns 403 when role is forbidden", async () => {
      authMock.mockResolvedValue({ user: { id: "17", role: "EMPLOYEE", institutionId: 1 } });

      const response = await getUsers(new Request("http://localhost/api/users"));

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
    });

    it("returns 200 with admin institution-scoped rows when no query is provided", async () => {
      authMock.mockResolvedValue({ user: { id: "18", role: "ADMIN", institutionId: 1 } });
      (db.select as jest.Mock).mockImplementationOnce(() =>
        makeSelect([
          { id: 1, name: "Ada", email: "ada@example.com", role: "ADMIN", institutionId: 1 },
        ]),
      );

      const response = await getUsers(new Request("http://localhost/api/users"));

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual([
        { id: 1, name: "Ada", email: "ada@example.com", role: "ADMIN", institutionId: 1 },
      ]);
    });

    it("returns 200 with superuser cross-tenant rows when no query is provided", async () => {
      authMock.mockResolvedValue({ user: { id: "30", role: "SUPERUSER", institutionId: 1 } });
      (db.select as jest.Mock).mockImplementationOnce(() =>
        makeSelect([
          { id: 1, name: "Ada", email: "ada@example.com", role: "ADMIN", institutionId: 1 },
          { id: 2, name: "Lin", email: "lin@example.com", role: "EMPLOYEE", institutionId: 2 },
        ]),
      );

      const response = await getUsers(new Request("http://localhost/api/users"));

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual([
        { id: 1, name: "Ada", email: "ada@example.com", role: "ADMIN", institutionId: 1 },
        { id: 2, name: "Lin", email: "lin@example.com", role: "EMPLOYEE", institutionId: 2 },
      ]);
    });

    it("returns 200 with superuser institution-filtered rows", async () => {
      authMock.mockResolvedValue({ user: { id: "31", role: "SUPERUSER", institutionId: 1 } });
      (db.select as jest.Mock).mockImplementationOnce(() =>
        makeSelect([
          { id: 2, name: "Lin", email: "lin@example.com", role: "EMPLOYEE", institutionId: 2 },
        ]),
      );

      const response = await getUsers(new Request("http://localhost/api/users?institutionId=2"));

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual([
        { id: 2, name: "Lin", email: "lin@example.com", role: "EMPLOYEE", institutionId: 2 },
      ]);
    });

    it("returns 200 when admin filters by own institution", async () => {
      authMock.mockResolvedValue({ user: { id: "32", role: "ADMIN", institutionId: 1 } });
      (db.select as jest.Mock).mockImplementationOnce(() =>
        makeSelect([
          { id: 1, name: "Ada", email: "ada@example.com", role: "ADMIN", institutionId: 1 },
        ]),
      );

      const response = await getUsers(new Request("http://localhost/api/users?institutionId=1"));

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual([
        { id: 1, name: "Ada", email: "ada@example.com", role: "ADMIN", institutionId: 1 },
      ]);
    });

    it("returns 403 when admin attempts cross-tenant filter", async () => {
      authMock.mockResolvedValue({ user: { id: "33", role: "ADMIN", institutionId: 1 } });

      const response = await getUsers(new Request("http://localhost/api/users?institutionId=2"));

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
    });

    it("returns 400 for invalid institutionId query values", async () => {
      authMock.mockResolvedValue({ user: { id: "34", role: "SUPERUSER", institutionId: 1 } });

      const invalidRequests = [
        new Request("http://localhost/api/users?institutionId=abc"),
        new Request("http://localhost/api/users?institutionId=-1"),
        new Request("http://localhost/api/users?institutionId=1.5"),
      ];

      for (const request of invalidRequests) {
        const response = await getUsers(request);
        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.error).toBe("Invalid request");
        expect(Array.isArray(body.details)).toBe(true);
      }
    });
  });

  describe("GET /api/users/[id]", () => {
    it("returns 401 when unauthenticated", async () => {
      authMock.mockResolvedValue(null);

      const response = await getUser(new Request("http://localhost/api/users/1"), {
        params: Promise.resolve({ id: "1" }),
      });

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    });

    it("returns 403 when role is forbidden", async () => {
      authMock.mockResolvedValue({ user: { id: "19", role: "EMPLOYEE", institutionId: 1 } });

      const response = await getUser(new Request("http://localhost/api/users/1"), {
        params: Promise.resolve({ id: "1" }),
      });

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
    });

    it("returns 400 for invalid user id", async () => {
      authMock.mockResolvedValue({ user: { id: "20", role: "ADMIN", institutionId: 1 } });

      const response = await getUser(new Request("http://localhost/api/users/abc"), {
        params: Promise.resolve({ id: "abc" }),
      });

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({ error: "Invalid user id" });
    });

    it("returns 404 when user is not found", async () => {
      authMock.mockResolvedValue({ user: { id: "21", role: "ADMIN", institutionId: 1 } });
      (db.select as jest.Mock).mockImplementationOnce(() => makeSelect([]));

      const response = await getUser(new Request("http://localhost/api/users/99"), {
        params: Promise.resolve({ id: "99" }),
      });

      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({ error: "User not found" });
    });

    it("returns 200 for valid user detail", async () => {
      authMock.mockResolvedValue({ user: { id: "22", role: "ADMIN", institutionId: 1 } });
      (db.select as jest.Mock).mockImplementationOnce(() =>
        makeSelect([
          { id: 44, name: "Grace", email: "grace@example.com", role: "EMPLOYEE", institutionId: 1 },
        ]),
      );

      const response = await getUser(new Request("http://localhost/api/users/44"), {
        params: Promise.resolve({ id: "44" }),
      });

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        id: 44,
        name: "Grace",
        email: "grace@example.com",
        role: "EMPLOYEE",
        institutionId: 1,
      });
    });
  });

  describe("PATCH /api/users/[id]", () => {
    it("returns 401 when unauthenticated", async () => {
      authMock.mockResolvedValue(null);

      const response = await patchUser(
        jsonRequest("http://localhost/api/users/1", "PATCH", { name: "Ada" }),
        { params: Promise.resolve({ id: "1" }) },
      );

      expect(response.status).toBe(401);
    });

    it("returns 403 when admin tries to change own role", async () => {
      authMock.mockResolvedValue({
        user: { id: "12", role: "ADMIN", institutionId: 1 },
      });

      (db.select as jest.Mock)
        .mockImplementationOnce(() => makeSelect([{ id: 1 }]))
        .mockImplementationOnce(() => makeSelect([{ id: 12, role: "ADMIN" }]));

      const response = await patchUser(
        jsonRequest("http://localhost/api/users/12", "PATCH", {
          role: "EMPLOYEE",
          institutionId: 1,
        }),
        { params: Promise.resolve({ id: "12" }) },
      );

      expect(response.status).toBe(403);
      expect(db.update).not.toHaveBeenCalled();
    });

    it("returns 400 for invalid user id", async () => {
      authMock.mockResolvedValue({ user: { id: "12", role: "ADMIN", institutionId: 1 } });

      const response = await patchUser(
        jsonRequest("http://localhost/api/users/abc", "PATCH", { name: "Ada" }),
        { params: Promise.resolve({ id: "abc" }) },
      );

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({ error: "Invalid user id" });
    });

    it("returns 400 for empty patch body", async () => {
      authMock.mockResolvedValue({ user: { id: "12", role: "ADMIN", institutionId: 1 } });

      const response = await patchUser(jsonRequest("http://localhost/api/users/12", "PATCH", {}), {
        params: Promise.resolve({ id: "12" }),
      });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Invalid request");
    });

    it("returns 400 when patch payload includes unknown fields", async () => {
      authMock.mockResolvedValue({ user: { id: "12", role: "ADMIN", institutionId: 1 } });

      const response = await patchUser(
        jsonRequest("http://localhost/api/users/12", "PATCH", {
          name: "Ada",
          institutionId: 1,
          extraField: "not-allowed",
        }),
        { params: Promise.resolve({ id: "12" }) },
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Invalid request");
      expect(Array.isArray(body.details)).toBe(true);
    });

    it("returns 403 when SUPERUSER omits tenant id", async () => {
      authMock.mockResolvedValue({ user: { id: "12", role: "SUPERUSER", institutionId: 1 } });

      const response = await patchUser(
        jsonRequest("http://localhost/api/users/12", "PATCH", { name: "Ada" }),
        { params: Promise.resolve({ id: "12" }) },
      );

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({ error: "Tenant required" });
    });

    it("returns 403 when SUPERUSER tries to change own role", async () => {
      authMock.mockResolvedValue({ user: { id: "70", role: "SUPERUSER", institutionId: 1 } });

      (db.select as jest.Mock)
        .mockImplementationOnce(() => makeSelect([{ id: 1 }]))
        .mockImplementationOnce(() => makeSelect([{ id: 70, role: "SUPERUSER" }]));

      const response = await patchUser(
        jsonRequest("http://localhost/api/users/70", "PATCH", {
          role: "ADMIN",
          institutionId: 1,
        }),
        { params: Promise.resolve({ id: "70" }) },
      );

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
      expect(db.update).not.toHaveBeenCalled();
    });

    it("allows SUPERUSER to change another user's role", async () => {
      authMock.mockResolvedValue({ user: { id: "71", role: "SUPERUSER", institutionId: 1 } });

      (db.select as jest.Mock)
        .mockImplementationOnce(() => makeSelect([{ id: 2 }]))
        .mockImplementationOnce(() => makeSelect([{ id: 44, role: "ADMIN" }]));

      (db.update as jest.Mock).mockImplementationOnce(() => makeUpdate());

      const response = await patchUser(
        jsonRequest("http://localhost/api/users/44", "PATCH", {
          role: "SUPERUSER",
          institutionId: 2,
        }),
        { params: Promise.resolve({ id: "44" }) },
      );

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ updated: true });
    });

    it("returns 404 when target user is out-of-tenant or missing", async () => {
      authMock.mockResolvedValue({ user: { id: "13", role: "ORG_SUPERUSER", institutionId: 1 } });

      (db.select as jest.Mock)
        .mockImplementationOnce(() => makeSelect([{ id: 1 }]))
        .mockImplementationOnce(() => makeSelect([]));

      const response = await patchUser(
        jsonRequest("http://localhost/api/users/999", "PATCH", {
          name: "Updated",
          institutionId: 1,
        }),
        { params: Promise.resolve({ id: "999" }) },
      );

      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({ error: "User not found" });
    });

    it("allows org-superuser to modify admin profile", async () => {
      authMock.mockResolvedValue({
        user: { id: "13", role: "ORG_SUPERUSER", institutionId: 1 },
      });

      (db.select as jest.Mock)
        .mockImplementationOnce(() => makeSelect([{ id: 1 }]))
        .mockImplementationOnce(() => makeSelect([{ id: 44, role: "ADMIN" }]));

      (db.update as jest.Mock).mockImplementationOnce(() => makeUpdate());

      const response = await patchUser(
        jsonRequest("http://localhost/api/users/44", "PATCH", {
          name: "Updated",
          institutionId: 1,
        }),
        { params: Promise.resolve({ id: "44" }) },
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ updated: true });
    });
  });

  describe("DELETE /api/users/[id]", () => {
    it("returns 401 when unauthenticated", async () => {
      authMock.mockResolvedValue(null);

      const response = await deleteUser(jsonRequest("http://localhost/api/users/1", "DELETE", {}), {
        params: Promise.resolve({ id: "1" }),
      });

      expect(response.status).toBe(401);
    });

    it("returns 403 when admin tries to delete self", async () => {
      authMock.mockResolvedValue({
        user: { id: "15", role: "ADMIN", institutionId: 1 },
      });

      (db.select as jest.Mock)
        .mockImplementationOnce(() => makeSelect([{ id: 1 }]))
        .mockImplementationOnce(() => makeSelect([{ id: 15, role: "ADMIN" }]));

      const response = await deleteUser(
        jsonRequest("http://localhost/api/users/15", "DELETE", { institutionId: 1 }),
        { params: Promise.resolve({ id: "15" }) },
      );

      expect(response.status).toBe(403);
      expect(db.delete).not.toHaveBeenCalled();
    });

    it("returns 400 for invalid user id", async () => {
      authMock.mockResolvedValue({ user: { id: "15", role: "ADMIN", institutionId: 1 } });

      const response = await deleteUser(
        jsonRequest("http://localhost/api/users/abc", "DELETE", { institutionId: 1 }),
        { params: Promise.resolve({ id: "abc" }) },
      );

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({ error: "Invalid user id" });
    });

    it("returns 400 for invalid JSON payload", async () => {
      authMock.mockResolvedValue({ user: { id: "15", role: "ADMIN", institutionId: 1 } });

      const response = await deleteUser(
        new Request("http://localhost/api/users/15", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: "{",
        }),
        { params: Promise.resolve({ id: "15" }) },
      );

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({ error: "Invalid JSON payload" });
    });

    it("returns 403 when SUPERUSER omits tenant id", async () => {
      authMock.mockResolvedValue({ user: { id: "25", role: "SUPERUSER", institutionId: 1 } });

      const response = await deleteUser(
        jsonRequest("http://localhost/api/users/60", "DELETE", {}),
        { params: Promise.resolve({ id: "60" }) },
      );

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({ error: "Tenant required" });
    });

    it("returns 403 when SUPERUSER tries to delete self", async () => {
      authMock.mockResolvedValue({ user: { id: "80", role: "SUPERUSER", institutionId: 1 } });

      (db.select as jest.Mock)
        .mockImplementationOnce(() => makeSelect([{ id: 1 }]))
        .mockImplementationOnce(() => makeSelect([{ id: 80, role: "SUPERUSER" }]));

      const response = await deleteUser(
        jsonRequest("http://localhost/api/users/80", "DELETE", { institutionId: 1 }),
        { params: Promise.resolve({ id: "80" }) },
      );

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
      expect(db.delete).not.toHaveBeenCalled();
    });

    it("allows SUPERUSER to delete another user", async () => {
      authMock.mockResolvedValue({ user: { id: "81", role: "SUPERUSER", institutionId: 1 } });

      (db.select as jest.Mock)
        .mockImplementationOnce(() => makeSelect([{ id: 2 }]))
        .mockImplementationOnce(() => makeSelect([{ id: 60, role: "ADMIN" }]));

      (db.delete as jest.Mock).mockImplementationOnce(() => makeDelete([{ id: 60 }]));

      const response = await deleteUser(
        jsonRequest("http://localhost/api/users/60", "DELETE", { institutionId: 2 }),
        { params: Promise.resolve({ id: "60" }) },
      );

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ deleted: true });
    });

    it("returns 404 when target user is out-of-tenant or missing", async () => {
      authMock.mockResolvedValue({ user: { id: "16", role: "ORG_SUPERUSER", institutionId: 1 } });

      (db.select as jest.Mock)
        .mockImplementationOnce(() => makeSelect([{ id: 1 }]))
        .mockImplementationOnce(() => makeSelect([]));

      const response = await deleteUser(
        jsonRequest("http://localhost/api/users/999", "DELETE", { institutionId: 1 }),
        { params: Promise.resolve({ id: "999" }) },
      );

      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({ error: "User not found" });
    });

    it("allows org-superuser to delete employee", async () => {
      authMock.mockResolvedValue({
        user: { id: "16", role: "ORG_SUPERUSER", institutionId: 1 },
      });

      (db.select as jest.Mock)
        .mockImplementationOnce(() => makeSelect([{ id: 1 }]))
        .mockImplementationOnce(() => makeSelect([{ id: 60, role: "EMPLOYEE" }]));

      (db.delete as jest.Mock).mockImplementationOnce(() => makeDelete([{ id: 60 }]));

      const response = await deleteUser(
        jsonRequest("http://localhost/api/users/60", "DELETE", { institutionId: 1 }),
        { params: Promise.resolve({ id: "60" }) },
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ deleted: true });
    });
  });
});
