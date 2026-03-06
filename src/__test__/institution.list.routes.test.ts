import { GET as getInstitutions, POST as postInstitutions } from "@/app/api/institution/list/route";
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
  },
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
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

function jsonRequest(url: string, method: string, body: unknown) {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Institution list API routes", () => {
  beforeEach(() => {
    authMock.mockReset();
    (db.select as jest.Mock).mockReset();
    (db.insert as jest.Mock).mockReset();
    (logger.error as jest.Mock).mockReset();
  });

  describe("GET /api/institution/list", () => {
    it("returns 401 when unauthenticated", async () => {
      authMock.mockResolvedValue(null);

      const response = await getInstitutions();

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    });

    it("returns 403 for non-superuser", async () => {
      authMock.mockResolvedValue({ user: { id: "1", role: "ADMIN", institutionId: 1 } });

      const response = await getInstitutions();

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
    });

    it("returns 200 with institution list for superuser", async () => {
      authMock.mockResolvedValue({ user: { id: "2", role: "SUPERUSER", institutionId: 1 } });
      (db.select as jest.Mock).mockImplementationOnce(() =>
        makeSelect([
          { id: 1, slug: "monarch-house", name: "Monarch House" },
          { id: 2, slug: "atlas-dome", name: "Atlas Dome" },
        ]),
      );

      const response = await getInstitutions();

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual([
        { id: 1, slug: "monarch-house", name: "Monarch House" },
        { id: 2, slug: "atlas-dome", name: "Atlas Dome" },
      ]);
    });
  });

  describe("POST /api/institution/list", () => {
    it("returns 401 when unauthenticated", async () => {
      authMock.mockResolvedValue(null);

      const response = await postInstitutions(
        jsonRequest("http://localhost/api/institution/list", "POST", {
          slug: "new-house",
          name: "New House",
          street_address: "123 Lane",
          city: "Austin",
          state_province: "TX",
          postal_code: "78701",
          country: "USA",
        }),
      );

      expect(response.status).toBe(401);
    });

    it("returns 403 for non-superuser", async () => {
      authMock.mockResolvedValue({ user: { id: "3", role: "ADMIN", institutionId: 1 } });

      const response = await postInstitutions(
        jsonRequest("http://localhost/api/institution/list", "POST", {
          slug: "new-house",
          name: "New House",
          street_address: "123 Lane",
          city: "Austin",
          state_province: "TX",
          postal_code: "78701",
          country: "USA",
        }),
      );

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
    });

    it("returns 400 for invalid JSON payload", async () => {
      authMock.mockResolvedValue({ user: { id: "4", role: "SUPERUSER", institutionId: 1 } });

      const response = await postInstitutions(
        new Request("http://localhost/api/institution/list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{",
        }),
      );

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({ error: "Invalid JSON payload" });
    });

    it("returns 400 for invalid body", async () => {
      authMock.mockResolvedValue({ user: { id: "5", role: "SUPERUSER", institutionId: 1 } });

      const response = await postInstitutions(
        jsonRequest("http://localhost/api/institution/list", "POST", {
          name: "Missing Slug",
        }),
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Invalid request");
      expect(Array.isArray(body.details)).toBe(true);
    });

    it("returns 400 when slug is already in use", async () => {
      authMock.mockResolvedValue({ user: { id: "6", role: "SUPERUSER", institutionId: 1 } });
      (db.select as jest.Mock).mockImplementationOnce(() => makeSelect([{ id: 9 }]));

      const response = await postInstitutions(
        jsonRequest("http://localhost/api/institution/list", "POST", {
          slug: "monarch-house",
          name: "New House",
          street_address: "123 Lane",
          city: "Austin",
          state_province: "TX",
          postal_code: "78701",
          country: "USA",
        }),
      );

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({ error: "Slug already in use" });
      expect(db.insert).not.toHaveBeenCalled();
    });

    it("returns 201 when institution is created", async () => {
      authMock.mockResolvedValue({ user: { id: "7", role: "SUPERUSER", institutionId: 1 } });
      (db.select as jest.Mock).mockImplementationOnce(() => makeSelect([]));
      (db.insert as jest.Mock).mockImplementationOnce(() =>
        makeInsert([
          {
            id: 3,
            slug: "new-house",
            name: "New House",
            street_address: "123 Lane",
            city: "Austin",
            state_province: "TX",
            postal_code: "78701",
            country: "USA",
          },
        ]),
      );

      const response = await postInstitutions(
        jsonRequest("http://localhost/api/institution/list", "POST", {
          slug: "new-house",
          name: "New House",
          street_address: "123 Lane",
          city: "Austin",
          state_province: "TX",
          postal_code: "78701",
          country: "USA",
        }),
      );

      expect(response.status).toBe(201);
      await expect(response.json()).resolves.toEqual({
        id: 3,
        slug: "new-house",
        name: "New House",
        street_address: "123 Lane",
        city: "Austin",
        state_province: "TX",
        postal_code: "78701",
        country: "USA",
      });
    });

    it("allows multiple creates when email_address is empty string by normalizing to null", async () => {
      authMock.mockResolvedValue({ user: { id: "8", role: "SUPERUSER", institutionId: 1 } });

      (db.select as jest.Mock)
        .mockImplementationOnce(() => makeSelect([]))
        .mockImplementationOnce(() => makeSelect([]));

      const valuesMock = jest.fn().mockReturnThis();
      const returningMock = jest
        .fn()
        .mockResolvedValueOnce([
          {
            id: 10,
            slug: "first-house",
            name: "First House",
            email_address: null,
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 11,
            slug: "second-house",
            name: "Second House",
            email_address: null,
          },
        ]);

      (db.insert as jest.Mock).mockImplementation(() => ({
        values: valuesMock,
        returning: returningMock,
      }));

      const firstResponse = await postInstitutions(
        jsonRequest("http://localhost/api/institution/list", "POST", {
          slug: "first-house",
          name: "First House",
          street_address: "123 Lane",
          city: "Austin",
          state_province: "TX",
          postal_code: "78701",
          country: "USA",
          email_address: "",
        }),
      );

      const secondResponse = await postInstitutions(
        jsonRequest("http://localhost/api/institution/list", "POST", {
          slug: "second-house",
          name: "Second House",
          street_address: "456 Lane",
          city: "Dallas",
          state_province: "TX",
          postal_code: "75201",
          country: "USA",
          email_address: "",
        }),
      );

      expect(firstResponse.status).toBe(201);
      expect(secondResponse.status).toBe(201);

      expect(valuesMock.mock.calls[0][0].email_address).toBeNull();
      expect(valuesMock.mock.calls[1][0].email_address).toBeNull();
    });
  });
});
