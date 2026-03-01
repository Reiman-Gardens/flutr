import {
  GET as getInstitution,
  PATCH as patchInstitution,
} from "@/app/api/institutions/[id]/route";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { ensureTenantExists } from "@/lib/tenant";

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  db: {
    select: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock("@/lib/tenant", () => {
  const actual = jest.requireActual("@/lib/tenant");
  return {
    ...actual,
    ensureTenantExists: jest.fn(),
  };
});

const authMock = auth as jest.Mock;
const ensureTenantExistsMock = ensureTenantExists as jest.Mock;

type SelectResult = Record<string, unknown>[];

function makeSelect(result: SelectResult) {
  return {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(result),
  };
}

function makeUpdate(result: Record<string, unknown>[]) {
  return {
    set: jest.fn().mockReturnThis(),
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

describe("Institutions detail API routes", () => {
  beforeEach(() => {
    authMock.mockReset();
    ensureTenantExistsMock.mockReset();
    ensureTenantExistsMock.mockResolvedValue(undefined);
    (db.select as jest.Mock).mockReset();
    (db.update as jest.Mock).mockReset();
    (logger.error as jest.Mock).mockReset();
  });

  describe("GET /api/institutions/[id]", () => {
    it("returns 401 when unauthenticated", async () => {
      authMock.mockResolvedValue(null);

      const response = await getInstitution(new Request("http://localhost/api/institutions/1"), {
        params: Promise.resolve({ id: "1" }),
      });

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    });

    it("returns 403 for non-superuser", async () => {
      authMock.mockResolvedValue({ user: { id: "1", role: "ADMIN", institutionId: 1 } });

      const response = await getInstitution(new Request("http://localhost/api/institutions/1"), {
        params: Promise.resolve({ id: "1" }),
      });

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
    });

    it("returns 400 for invalid institution id", async () => {
      authMock.mockResolvedValue({ user: { id: "2", role: "SUPERUSER", institutionId: 1 } });

      const response = await getInstitution(
        new Request("http://localhost/api/institutions/not-a-number"),
        {
          params: Promise.resolve({ id: "not-a-number" }),
        },
      );

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({ error: "Invalid institution id" });
    });

    it("returns 404 when institution does not exist", async () => {
      authMock.mockResolvedValue({ user: { id: "3", role: "SUPERUSER", institutionId: 1 } });
      ensureTenantExistsMock.mockRejectedValueOnce(new Error("Institution not found"));

      const response = await getInstitution(new Request("http://localhost/api/institutions/99"), {
        params: Promise.resolve({ id: "99" }),
      });

      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({ error: "Institution not found" });
    });

    it("returns 200 with institution detail", async () => {
      authMock.mockResolvedValue({ user: { id: "4", role: "SUPERUSER", institutionId: 1 } });
      (db.select as jest.Mock).mockImplementationOnce(() =>
        makeSelect([
          {
            id: 1,
            slug: "monarch-house",
            name: "Monarch House",
            street_address: "123 Lane",
          },
        ]),
      );

      const response = await getInstitution(new Request("http://localhost/api/institutions/1"), {
        params: Promise.resolve({ id: "1" }),
      });

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        id: 1,
        slug: "monarch-house",
        name: "Monarch House",
        street_address: "123 Lane",
      });
    });
  });

  describe("PATCH /api/institutions/[id]", () => {
    it("returns 401 when unauthenticated", async () => {
      authMock.mockResolvedValue(null);

      const response = await patchInstitution(
        jsonRequest("http://localhost/api/institutions/1", "PATCH", { name: "Updated" }),
        { params: Promise.resolve({ id: "1" }) },
      );

      expect(response.status).toBe(401);
    });

    it("returns 403 for non-superuser", async () => {
      authMock.mockResolvedValue({ user: { id: "5", role: "ADMIN", institutionId: 1 } });

      const response = await patchInstitution(
        jsonRequest("http://localhost/api/institutions/1", "PATCH", { name: "Updated" }),
        { params: Promise.resolve({ id: "1" }) },
      );

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
    });

    it("returns 400 for invalid institution id", async () => {
      authMock.mockResolvedValue({ user: { id: "6", role: "SUPERUSER", institutionId: 1 } });

      const response = await patchInstitution(
        jsonRequest("http://localhost/api/institutions/abc", "PATCH", { name: "Updated" }),
        { params: Promise.resolve({ id: "abc" }) },
      );

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({ error: "Invalid institution id" });
    });

    it("returns 404 when institution does not exist", async () => {
      authMock.mockResolvedValue({ user: { id: "7", role: "SUPERUSER", institutionId: 1 } });
      ensureTenantExistsMock.mockRejectedValueOnce(new Error("Institution not found"));

      const response = await patchInstitution(
        jsonRequest("http://localhost/api/institutions/88", "PATCH", { name: "Updated" }),
        { params: Promise.resolve({ id: "88" }) },
      );

      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({ error: "Institution not found" });
    });

    it("returns 400 for invalid JSON payload", async () => {
      authMock.mockResolvedValue({ user: { id: "8", role: "SUPERUSER", institutionId: 1 } });

      const response = await patchInstitution(
        new Request("http://localhost/api/institutions/1", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: "{",
        }),
        { params: Promise.resolve({ id: "1" }) },
      );

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({ error: "Invalid JSON payload" });
    });

    it("returns 400 for invalid request body", async () => {
      authMock.mockResolvedValue({ user: { id: "9", role: "SUPERUSER", institutionId: 1 } });

      const response = await patchInstitution(
        jsonRequest("http://localhost/api/institutions/1", "PATCH", {}),
        { params: Promise.resolve({ id: "1" }) },
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Invalid request");
      expect(Array.isArray(body.details)).toBe(true);
    });

    it("returns 400 when id is provided in body", async () => {
      authMock.mockResolvedValue({ user: { id: "10", role: "SUPERUSER", institutionId: 1 } });

      const response = await patchInstitution(
        jsonRequest("http://localhost/api/institutions/1", "PATCH", { id: 999, name: "Updated" }),
        { params: Promise.resolve({ id: "1" }) },
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Invalid request");
    });

    it("returns 400 when slug is already in use", async () => {
      authMock.mockResolvedValue({ user: { id: "11", role: "SUPERUSER", institutionId: 1 } });
      (db.select as jest.Mock).mockImplementationOnce(() => makeSelect([{ id: 2 }]));

      const response = await patchInstitution(
        jsonRequest("http://localhost/api/institutions/1", "PATCH", { slug: "atlas-dome" }),
        { params: Promise.resolve({ id: "1" }) },
      );

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({ error: "Slug already in use" });
      expect(db.update).not.toHaveBeenCalled();
    });

    it("returns 200 and sets updated_at on successful update", async () => {
      authMock.mockResolvedValue({ user: { id: "12", role: "SUPERUSER", institutionId: 1 } });

      (db.select as jest.Mock).mockImplementationOnce(() => makeSelect([]));
      const setMock = jest.fn().mockReturnThis();
      const whereMock = jest.fn().mockReturnThis();
      const returningMock = jest.fn().mockResolvedValue([
        {
          id: 1,
          slug: "monarch-house",
          name: "Updated Name",
        },
      ]);

      (db.update as jest.Mock).mockImplementationOnce(() => ({
        set: setMock,
        where: whereMock,
        returning: returningMock,
      }));

      const response = await patchInstitution(
        jsonRequest("http://localhost/api/institutions/1", "PATCH", { name: "Updated Name" }),
        { params: Promise.resolve({ id: "1" }) },
      );

      expect(response.status).toBe(200);
      const setArg = setMock.mock.calls[0][0];
      expect(setArg.name).toBe("Updated Name");
      expect(setArg.updated_at).toBeInstanceOf(Date);
      await expect(response.json()).resolves.toEqual({
        id: 1,
        slug: "monarch-house",
        name: "Updated Name",
      });
    });
  });
});
