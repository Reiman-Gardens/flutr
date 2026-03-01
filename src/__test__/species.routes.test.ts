import { GET as getSpecies, POST as postSpecies } from "@/app/api/species/route";
import { PATCH as patchSpecies, DELETE as deleteSpecies } from "@/app/api/species/[id]/route";
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

function makeUpdate(result: Record<string, unknown>[]) {
  return {
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue(result),
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

const validCreatePayload = {
  scientific_name: "Danaus plexippus",
  common_name: "Monarch",
  family: "Nymphalidae",
  sub_family: "Danainae",
  lifespan_days: 28,
  range: ["North America"],
  description: "Migratory butterfly",
  host_plant: "Milkweed",
  habitat: "Fields",
  fun_facts: "Long migration",
  img_wings_open: "https://example.com/open.jpg",
  img_wings_closed: "https://example.com/closed.jpg",
  extra_img_1: "https://example.com/extra1.jpg",
  extra_img_2: "https://example.com/extra2.jpg",
};

describe("Species management API routes", () => {
  beforeEach(() => {
    authMock.mockReset();
    (db.select as jest.Mock).mockReset();
    (db.insert as jest.Mock).mockReset();
    (db.update as jest.Mock).mockReset();
    (db.delete as jest.Mock).mockReset();
    (logger.error as jest.Mock).mockReset();
  });

  describe("GET /api/species", () => {
    it("returns 401 when unauthenticated", async () => {
      authMock.mockResolvedValue(null);

      const response = await getSpecies();

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    });

    it("returns 403 for non-superuser", async () => {
      authMock.mockResolvedValue({ user: { id: "1", role: "ADMIN", institutionId: 1 } });

      const response = await getSpecies();

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
    });

    it("returns 200 for superuser", async () => {
      authMock.mockResolvedValue({ user: { id: "2", role: "SUPERUSER", institutionId: 1 } });
      (db.select as jest.Mock).mockImplementationOnce(() =>
        makeSelect([{ id: 1, ...validCreatePayload }]),
      );

      const response = await getSpecies();

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual([{ id: 1, ...validCreatePayload }]);
    });
  });

  describe("POST /api/species", () => {
    it("returns 403 for non-superuser", async () => {
      authMock.mockResolvedValue({ user: { id: "3", role: "EMPLOYEE", institutionId: 1 } });

      const response = await postSpecies(
        jsonRequest("http://localhost/api/species", "POST", validCreatePayload),
      );

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
    });

    it("returns 201 for valid create", async () => {
      authMock.mockResolvedValue({ user: { id: "4", role: "SUPERUSER", institutionId: 1 } });
      (db.select as jest.Mock).mockImplementationOnce(() => makeSelect([]));
      (db.insert as jest.Mock).mockImplementationOnce(() =>
        makeInsert([{ id: 10, ...validCreatePayload }]),
      );

      const response = await postSpecies(
        jsonRequest("http://localhost/api/species", "POST", validCreatePayload),
      );

      expect(response.status).toBe(201);
      await expect(response.json()).resolves.toEqual({ id: 10, ...validCreatePayload });
    });

    it("returns 201 for valid create with empty range array", async () => {
      authMock.mockResolvedValue({ user: { id: "4b", role: "SUPERUSER", institutionId: 1 } });
      (db.select as jest.Mock).mockImplementationOnce(() => makeSelect([]));
      (db.insert as jest.Mock).mockImplementationOnce(() =>
        makeInsert([{ id: 11, ...validCreatePayload, range: [] }]),
      );

      const response = await postSpecies(
        jsonRequest("http://localhost/api/species", "POST", {
          ...validCreatePayload,
          range: [],
        }),
      );

      expect(response.status).toBe(201);
      await expect(response.json()).resolves.toEqual({ id: 11, ...validCreatePayload, range: [] });
    });

    it("returns 409 for duplicate scientific_name", async () => {
      authMock.mockResolvedValue({ user: { id: "5", role: "SUPERUSER", institutionId: 1 } });
      (db.select as jest.Mock).mockImplementationOnce(() => makeSelect([{ id: 9 }]));

      const response = await postSpecies(
        jsonRequest("http://localhost/api/species", "POST", validCreatePayload),
      );

      expect(response.status).toBe(409);
      await expect(response.json()).resolves.toEqual({ error: "Scientific name already in use" });
    });

    it("returns 400 for unknown fields", async () => {
      authMock.mockResolvedValue({ user: { id: "6", role: "SUPERUSER", institutionId: 1 } });

      const response = await postSpecies(
        jsonRequest("http://localhost/api/species", "POST", {
          ...validCreatePayload,
          extraField: "not-allowed",
        }),
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Invalid request");
      expect(Array.isArray(body.details)).toBe(true);
    });

    it("returns 400 for invalid lifespan_days", async () => {
      authMock.mockResolvedValue({ user: { id: "7", role: "SUPERUSER", institutionId: 1 } });

      const response = await postSpecies(
        jsonRequest("http://localhost/api/species", "POST", {
          ...validCreatePayload,
          lifespan_days: -1,
        }),
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Invalid request");
      expect(Array.isArray(body.details)).toBe(true);
    });

    it("returns 400 for range entries that are empty or whitespace", async () => {
      authMock.mockResolvedValue({ user: { id: "7b", role: "SUPERUSER", institutionId: 1 } });

      const responses = await Promise.all([
        postSpecies(
          jsonRequest("http://localhost/api/species", "POST", {
            ...validCreatePayload,
            range: [""],
          }),
        ),
        postSpecies(
          jsonRequest("http://localhost/api/species", "POST", {
            ...validCreatePayload,
            range: ["   "],
          }),
        ),
      ]);

      for (const response of responses) {
        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.error).toBe("Invalid request");
        expect(Array.isArray(body.details)).toBe(true);
      }
    });
  });

  describe("PATCH /api/species/[id]", () => {
    it("returns 403 for non-superuser", async () => {
      authMock.mockResolvedValue({ user: { id: "8", role: "ADMIN", institutionId: 1 } });

      const response = await patchSpecies(
        jsonRequest("http://localhost/api/species/1", "PATCH", { common_name: "Updated" }),
        { params: Promise.resolve({ id: "1" }) },
      );

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
    });

    it("returns 200 when updating one field", async () => {
      authMock.mockResolvedValue({ user: { id: "9", role: "SUPERUSER", institutionId: 1 } });
      (db.update as jest.Mock).mockImplementationOnce(() =>
        makeUpdate([{ id: 1, ...validCreatePayload, common_name: "Updated" }]),
      );

      const response = await patchSpecies(
        jsonRequest("http://localhost/api/species/1", "PATCH", { common_name: "Updated" }),
        { params: Promise.resolve({ id: "1" }) },
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.common_name).toBe("Updated");
    });

    it("returns 400 for empty body", async () => {
      authMock.mockResolvedValue({ user: { id: "10", role: "SUPERUSER", institutionId: 1 } });

      const response = await patchSpecies(
        jsonRequest("http://localhost/api/species/1", "PATCH", {}),
        { params: Promise.resolve({ id: "1" }) },
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Invalid request");
    });

    it("returns 400 for unknown fields", async () => {
      authMock.mockResolvedValue({ user: { id: "11", role: "SUPERUSER", institutionId: 1 } });

      const response = await patchSpecies(
        jsonRequest("http://localhost/api/species/1", "PATCH", { extraField: "not-allowed" }),
        { params: Promise.resolve({ id: "1" }) },
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Invalid request");
      expect(Array.isArray(body.details)).toBe(true);
    });

    it("returns 409 when scientific_name conflicts", async () => {
      authMock.mockResolvedValue({ user: { id: "12", role: "SUPERUSER", institutionId: 1 } });
      (db.select as jest.Mock).mockImplementationOnce(() => makeSelect([{ id: 2 }]));

      const response = await patchSpecies(
        jsonRequest("http://localhost/api/species/1", "PATCH", {
          scientific_name: "Danaus plexippus",
        }),
        { params: Promise.resolve({ id: "1" }) },
      );

      expect(response.status).toBe(409);
      await expect(response.json()).resolves.toEqual({ error: "Scientific name already in use" });
    });

    it("returns 404 when species id does not exist", async () => {
      authMock.mockResolvedValue({ user: { id: "13", role: "SUPERUSER", institutionId: 1 } });
      (db.update as jest.Mock).mockImplementationOnce(() => makeUpdate([]));

      const response = await patchSpecies(
        jsonRequest("http://localhost/api/species/999", "PATCH", { common_name: "Updated" }),
        { params: Promise.resolve({ id: "999" }) },
      );

      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({ error: "Species not found" });
    });

    it("returns 200 when updating range to empty array", async () => {
      authMock.mockResolvedValue({ user: { id: "13b", role: "SUPERUSER", institutionId: 1 } });
      (db.update as jest.Mock).mockImplementationOnce(() =>
        makeUpdate([{ id: 1, ...validCreatePayload, range: [] }]),
      );

      const response = await patchSpecies(
        jsonRequest("http://localhost/api/species/1", "PATCH", { range: [] }),
        { params: Promise.resolve({ id: "1" }) },
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.range).toEqual([]);
    });
  });

  describe("DELETE /api/species/[id]", () => {
    it("returns 403 for non-superuser", async () => {
      authMock.mockResolvedValue({ user: { id: "14", role: "ADMIN", institutionId: 1 } });

      const response = await deleteSpecies(
        new Request("http://localhost/api/species/1", { method: "DELETE" }),
        {
          params: Promise.resolve({ id: "1" }),
        },
      );

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
    });

    it("returns 200 when delete succeeds", async () => {
      authMock.mockResolvedValue({ user: { id: "15", role: "SUPERUSER", institutionId: 1 } });
      (db.delete as jest.Mock).mockImplementationOnce(() => makeDelete([{ id: 1 }]));

      const response = await deleteSpecies(
        new Request("http://localhost/api/species/1", { method: "DELETE" }),
        {
          params: Promise.resolve({ id: "1" }),
        },
      );

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ deleted: true });
    });

    it("returns 404 when species id does not exist", async () => {
      authMock.mockResolvedValue({ user: { id: "16", role: "SUPERUSER", institutionId: 1 } });
      (db.delete as jest.Mock).mockImplementationOnce(() => makeDelete([]));

      const response = await deleteSpecies(
        new Request("http://localhost/api/species/999", { method: "DELETE" }),
        {
          params: Promise.resolve({ id: "999" }),
        },
      );

      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({ error: "Species not found" });
    });
  });
});
