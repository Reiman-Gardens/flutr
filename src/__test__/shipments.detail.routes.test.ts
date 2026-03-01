import {
  GET as getShipment,
  PATCH as patchShipment,
  DELETE as deleteShipment,
} from "@/app/api/shipments/[id]/route";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  db: {
    select: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    transaction: jest.fn(),
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
    ensureTenantExists: jest.fn().mockResolvedValue(undefined),
  };
});

const authMock = auth as jest.Mock;

function makeSelect(result: Record<string, unknown>[]) {
  return {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(result),
    then: (resolve: (value: Record<string, unknown>[]) => void) =>
      Promise.resolve(result).then(resolve),
  };
}

function makeDelete() {
  return {
    where: jest.fn().mockResolvedValue(undefined),
  };
}

function jsonRequest(url: string, method: string, body: unknown) {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Shipment detail API routes", () => {
  beforeEach(() => {
    authMock.mockReset();
    (db.select as jest.Mock).mockReset();
    (db.update as jest.Mock).mockReset();
    (db.delete as jest.Mock).mockReset();
    (db.transaction as jest.Mock).mockReset();
    (logger.error as jest.Mock).mockReset();
  });

  describe("GET /api/shipments/[id]", () => {
    it("returns 401 when unauthenticated", async () => {
      authMock.mockResolvedValue(null);

      const response = await getShipment(new Request("http://localhost/api/shipments/1"), {
        params: Promise.resolve({ id: "1" }),
      });

      expect(response.status).toBe(401);
    });

    it("returns 400 for invalid shipment id", async () => {
      authMock.mockResolvedValue({ user: { id: "u1", role: "EMPLOYEE", institutionId: 1 } });

      const response = await getShipment(new Request("http://localhost/api/shipments/abc"), {
        params: Promise.resolve({ id: "abc" }),
      });

      expect(response.status).toBe(400);
    });

    it("returns 403 when role is forbidden", async () => {
      authMock.mockResolvedValue({ user: { id: "u1b", role: "UNKNOWN", institutionId: 1 } });

      const response = await getShipment(new Request("http://localhost/api/shipments/1"), {
        params: Promise.resolve({ id: "1" }),
      });

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
    });

    it("returns 404 when shipment is not found", async () => {
      authMock.mockResolvedValue({ user: { id: "u2", role: "EMPLOYEE", institutionId: 1 } });
      (db.select as jest.Mock).mockImplementationOnce(() => makeSelect([]));

      const response = await getShipment(new Request("http://localhost/api/shipments/77"), {
        params: Promise.resolve({ id: "77" }),
      });

      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({ error: "Shipment not found" });
    });

    it("returns shipment details on success", async () => {
      authMock.mockResolvedValue({ user: { id: "u3", role: "EMPLOYEE", institutionId: 1 } });

      (db.select as jest.Mock)
        .mockImplementationOnce(() =>
          makeSelect([
            {
              id: 10,
              institutionId: 1,
              supplierCode: "LPS",
              shipmentDate: new Date("2026-02-01T00:00:00.000Z"),
              arrivalDate: new Date("2026-02-02T00:00:00.000Z"),
              createdAt: new Date("2026-02-01T00:00:00.000Z"),
            },
          ]),
        )
        .mockImplementationOnce(() =>
          makeSelect([
            {
              id: 100,
              butterflySpeciesId: 1,
              numberReceived: 10,
              emergedInTransit: 0,
              damagedInTransit: 0,
              diseasedInTransit: 0,
              parasite: 0,
              nonEmergence: 0,
              poorEmergence: 0,
              scientificName: "Danaus plexippus",
              imageOpen: "https://example.com/open.jpg",
              imageClosed: null,
            },
          ]),
        );

      const response = await getShipment(new Request("http://localhost/api/shipments/10"), {
        params: Promise.resolve({ id: "10" }),
      });

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        shipment: {
          id: 10,
          institutionId: 1,
          supplierCode: "LPS",
          shipmentDate: "2026-02-01T00:00:00.000Z",
          arrivalDate: "2026-02-02T00:00:00.000Z",
          createdAt: "2026-02-01T00:00:00.000Z",
        },
        items: [
          {
            id: 100,
            butterflySpeciesId: 1,
            numberReceived: 10,
            emergedInTransit: 0,
            damagedInTransit: 0,
            diseasedInTransit: 0,
            parasite: 0,
            nonEmergence: 0,
            poorEmergence: 0,
            scientificName: "Danaus plexippus",
            imageUrl: "https://example.com/open.jpg",
          },
        ],
      });
    });
  });

  describe("PATCH /api/shipments/[id]", () => {
    it("returns 401 when unauthenticated", async () => {
      authMock.mockResolvedValue(null);

      const response = await patchShipment(
        jsonRequest("http://localhost/api/shipments/10", "PATCH", { supplierCode: "LPS" }),
        { params: Promise.resolve({ id: "10" }) },
      );

      expect(response.status).toBe(401);
    });

    it("returns 400 for invalid shipment id", async () => {
      authMock.mockResolvedValue({ user: { id: "u4", role: "EMPLOYEE", institutionId: 1 } });

      const response = await patchShipment(
        jsonRequest("http://localhost/api/shipments/abc", "PATCH", { supplierCode: "LPS" }),
        { params: Promise.resolve({ id: "abc" }) },
      );

      expect(response.status).toBe(400);
    });

    it("returns 403 when role is forbidden", async () => {
      authMock.mockResolvedValue({ user: { id: "u4b", role: "UNKNOWN", institutionId: 1 } });

      const response = await patchShipment(
        jsonRequest("http://localhost/api/shipments/10", "PATCH", { supplierCode: "LPS" }),
        { params: Promise.resolve({ id: "10" }) },
      );

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
    });

    it("returns 400 for invalid JSON payload", async () => {
      authMock.mockResolvedValue({ user: { id: "u4c", role: "EMPLOYEE", institutionId: 1 } });

      const response = await patchShipment(
        new Request("http://localhost/api/shipments/10", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: "{",
        }),
        { params: Promise.resolve({ id: "10" }) },
      );

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({ error: "Invalid JSON payload" });
    });

    it("returns 400 for empty patch body", async () => {
      authMock.mockResolvedValue({ user: { id: "u4d", role: "EMPLOYEE", institutionId: 1 } });

      const response = await patchShipment(
        jsonRequest("http://localhost/api/shipments/10", "PATCH", {}),
        { params: Promise.resolve({ id: "10" }) },
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Invalid request");
    });

    it("returns 404 when shipment is not found", async () => {
      authMock.mockResolvedValue({ user: { id: "u5", role: "EMPLOYEE", institutionId: 1 } });
      (db.select as jest.Mock).mockImplementationOnce(() => makeSelect([]));

      const response = await patchShipment(
        jsonRequest("http://localhost/api/shipments/22", "PATCH", {
          supplierCode: "LPS",
          institutionId: 1,
        }),
        { params: Promise.resolve({ id: "22" }) },
      );

      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({ error: "Shipment not found" });
    });

    it("returns 200 on successful update", async () => {
      authMock.mockResolvedValue({ user: { id: "u6", role: "EMPLOYEE", institutionId: 1 } });

      (db.select as jest.Mock)
        .mockImplementationOnce(() =>
          makeSelect([
            {
              id: 10,
              shipment_date: new Date("2026-02-01T00:00:00.000Z"),
              arrival_date: new Date("2026-02-02T00:00:00.000Z"),
            },
          ]),
        )
        .mockImplementationOnce(() => makeSelect([{ code: "LPS" }]));

      (db.transaction as jest.Mock).mockImplementationOnce(async (callback) =>
        callback({
          update: jest.fn().mockImplementation(() => ({
            set: jest.fn().mockReturnThis(),
            where: jest.fn().mockResolvedValue(undefined),
          })),
          select: jest.fn().mockImplementation(() => ({
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockResolvedValue([]),
          })),
        }),
      );

      const response = await patchShipment(
        jsonRequest("http://localhost/api/shipments/10", "PATCH", {
          supplierCode: "LPS",
          institutionId: 1,
        }),
        { params: Promise.resolve({ id: "10" }) },
      );

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ updated: 0 });
    });

    it("returns 400 for ITEMS_OUT_OF_SCOPE branch", async () => {
      authMock.mockResolvedValue({ user: { id: "u6b", role: "EMPLOYEE", institutionId: 1 } });

      (db.select as jest.Mock).mockImplementationOnce(() =>
        makeSelect([
          {
            id: 10,
            shipment_date: new Date("2026-02-01T00:00:00.000Z"),
            arrival_date: new Date("2026-02-02T00:00:00.000Z"),
          },
        ]),
      );

      (db.transaction as jest.Mock).mockImplementationOnce(async (callback) =>
        callback({
          update: jest.fn().mockImplementation(() => ({
            set: jest.fn().mockReturnThis(),
            where: jest.fn().mockResolvedValue(undefined),
          })),
          select: jest.fn().mockImplementation(() => ({
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockResolvedValue([]),
          })),
        }),
      );

      const response = await patchShipment(
        jsonRequest("http://localhost/api/shipments/10", "PATCH", {
          institutionId: 1,
          items: [
            {
              id: 123,
              numberReceived: 10,
              emergedInTransit: 0,
              damagedInTransit: 0,
              diseasedInTransit: 0,
              parasite: 0,
              nonEmergence: 0,
              poorEmergence: 0,
            },
          ],
        }),
        { params: Promise.resolve({ id: "10" }) },
      );

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        error: "One or more items do not belong to this shipment",
      });
    });

    it("returns 403 when SUPERUSER omits institutionId", async () => {
      authMock.mockResolvedValue({ user: { id: "u6c", role: "SUPERUSER", institutionId: 1 } });

      const response = await patchShipment(
        jsonRequest("http://localhost/api/shipments/10", "PATCH", {
          supplierCode: "LPS",
        }),
        { params: Promise.resolve({ id: "10" }) },
      );

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({ error: "Tenant required" });
    });

    it("returns 200 when SUPERUSER provides institutionId", async () => {
      authMock.mockResolvedValue({ user: { id: "u6d", role: "SUPERUSER", institutionId: 1 } });

      (db.select as jest.Mock)
        .mockImplementationOnce(() =>
          makeSelect([
            {
              id: 10,
              shipment_date: new Date("2026-02-01T00:00:00.000Z"),
              arrival_date: new Date("2026-02-02T00:00:00.000Z"),
            },
          ]),
        )
        .mockImplementationOnce(() => makeSelect([{ code: "LPS" }]));

      (db.transaction as jest.Mock).mockImplementationOnce(async (callback) =>
        callback({
          update: jest.fn().mockImplementation(() => ({
            set: jest.fn().mockReturnThis(),
            where: jest.fn().mockResolvedValue(undefined),
          })),
          select: jest.fn().mockImplementation(() => ({
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockResolvedValue([]),
          })),
        }),
      );

      const response = await patchShipment(
        jsonRequest("http://localhost/api/shipments/10", "PATCH", {
          supplierCode: "LPS",
          institutionId: 1,
        }),
        { params: Promise.resolve({ id: "10" }) },
      );

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ updated: 0 });
    });
  });

  describe("DELETE /api/shipments/[id]", () => {
    it("returns 401 when unauthenticated", async () => {
      authMock.mockResolvedValue(null);

      const response = await deleteShipment(
        jsonRequest("http://localhost/api/shipments/1", "DELETE", {}),
        {
          params: Promise.resolve({ id: "1" }),
        },
      );

      expect(response.status).toBe(401);
    });

    it("returns 404 when shipment is not found", async () => {
      authMock.mockResolvedValue({ user: { id: "u7", role: "EMPLOYEE", institutionId: 1 } });
      (db.select as jest.Mock).mockImplementationOnce(() => makeSelect([]));

      const response = await deleteShipment(
        jsonRequest("http://localhost/api/shipments/13", "DELETE", { institutionId: 1 }),
        { params: Promise.resolve({ id: "13" }) },
      );

      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({ error: "Shipment not found" });
    });

    it("returns 403 when role is forbidden", async () => {
      authMock.mockResolvedValue({ user: { id: "u7b", role: "UNKNOWN", institutionId: 1 } });

      const response = await deleteShipment(
        jsonRequest("http://localhost/api/shipments/13", "DELETE", { institutionId: 1 }),
        { params: Promise.resolve({ id: "13" }) },
      );

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
    });

    it("returns 400 for invalid shipment id", async () => {
      authMock.mockResolvedValue({ user: { id: "u7c", role: "EMPLOYEE", institutionId: 1 } });

      const response = await deleteShipment(
        jsonRequest("http://localhost/api/shipments/abc", "DELETE", { institutionId: 1 }),
        { params: Promise.resolve({ id: "abc" }) },
      );

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({ error: "Invalid shipment id" });
    });

    it("returns 403 when SUPERUSER omits tenant id", async () => {
      authMock.mockResolvedValue({ user: { id: "u7d", role: "SUPERUSER", institutionId: 1 } });

      const response = await deleteShipment(
        jsonRequest("http://localhost/api/shipments/13", "DELETE", {}),
        { params: Promise.resolve({ id: "13" }) },
      );

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({ error: "Tenant required" });
    });

    it("returns 400 for invalid delete body", async () => {
      authMock.mockResolvedValue({ user: { id: "u7e", role: "EMPLOYEE", institutionId: 1 } });

      const response = await deleteShipment(
        jsonRequest("http://localhost/api/shipments/13", "DELETE", { institutionId: -1 }),
        { params: Promise.resolve({ id: "13" }) },
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Invalid request");
    });

    it("returns 200 on successful delete", async () => {
      authMock.mockResolvedValue({ user: { id: "u8", role: "EMPLOYEE", institutionId: 1 } });
      (db.select as jest.Mock).mockImplementationOnce(() => makeSelect([{ id: 13 }]));
      (db.delete as jest.Mock).mockImplementationOnce(() => makeDelete());

      const response = await deleteShipment(
        jsonRequest("http://localhost/api/shipments/13", "DELETE", { institutionId: 1 }),
        { params: Promise.resolve({ id: "13" }) },
      );

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ deleted: true });
    });
  });
});
