import { GET as getShipments, POST as postShipments } from "@/app/api/shipments/route";
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
    limit: jest.fn().mockResolvedValue(result),
    orderBy: jest.fn().mockResolvedValue(result),
    then: (resolve: (value: Record<string, unknown>[]) => void) =>
      Promise.resolve(result).then(resolve),
  };
}

function jsonRequest(url: string, method: string, body: unknown) {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Shipments collection API routes", () => {
  beforeEach(() => {
    authMock.mockReset();
    (db.select as jest.Mock).mockReset();
    (db.insert as jest.Mock).mockReset();
    (db.transaction as jest.Mock).mockReset();
    (logger.error as jest.Mock).mockReset();
  });

  describe("GET /api/shipments", () => {
    it("returns 401 when unauthenticated", async () => {
      authMock.mockResolvedValue(null);

      const response = await getShipments();

      expect(response.status).toBe(401);
    });

    it("returns 403 when role is forbidden", async () => {
      authMock.mockResolvedValue({ user: { id: "u1", role: "UNKNOWN", institutionId: 1 } });

      const response = await getShipments();

      expect(response.status).toBe(403);
    });

    it("returns tenant-scoped shipment list", async () => {
      authMock.mockResolvedValue({ user: { id: "u2", role: "EMPLOYEE", institutionId: 1 } });
      (db.select as jest.Mock).mockImplementationOnce(() =>
        makeSelect([
          {
            id: 10,
            supplierCode: "LPS",
            shipmentDate: new Date("2026-02-01T00:00:00.000Z"),
            arrivalDate: new Date("2026-02-02T00:00:00.000Z"),
            createdAt: new Date("2026-02-01T00:00:00.000Z"),
          },
        ]),
      );

      const response = await getShipments();

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual([
        {
          id: 10,
          supplierCode: "LPS",
          shipmentDate: "2026-02-01T00:00:00.000Z",
          arrivalDate: "2026-02-02T00:00:00.000Z",
          createdAt: "2026-02-01T00:00:00.000Z",
        },
      ]);
    });
  });

  describe("POST /api/shipments", () => {
    it("returns 401 when unauthenticated", async () => {
      authMock.mockResolvedValue(null);

      const response = await postShipments(
        jsonRequest("http://localhost/api/shipments", "POST", {
          supplierCode: "LPS",
          shipmentDate: "2026-02-01T00:00:00.000Z",
          arrivalDate: "2026-02-02T00:00:00.000Z",
          items: [{ butterflySpeciesId: 1, numberReceived: 1 }],
        }),
      );

      expect(response.status).toBe(401);
    });

    it("returns 400 for invalid body", async () => {
      authMock.mockResolvedValue({ user: { id: "u3", role: "EMPLOYEE", institutionId: 1 } });

      const response = await postShipments(
        jsonRequest("http://localhost/api/shipments", "POST", {
          supplierCode: "",
        }),
      );

      expect(response.status).toBe(400);
    });

    it("returns 403 when role is forbidden", async () => {
      authMock.mockResolvedValue({ user: { id: "u6", role: "UNKNOWN", institutionId: 1 } });

      const response = await postShipments(
        jsonRequest("http://localhost/api/shipments", "POST", {
          supplierCode: "LPS",
          shipmentDate: "2026-02-01T00:00:00.000Z",
          arrivalDate: "2026-02-02T00:00:00.000Z",
          items: [
            {
              butterflySpeciesId: 1,
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
      );

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
    });

    it("returns 400 for invalid JSON payload", async () => {
      authMock.mockResolvedValue({ user: { id: "u7", role: "EMPLOYEE", institutionId: 1 } });

      const response = await postShipments(
        new Request("http://localhost/api/shipments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{",
        }),
      );

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({ error: "Invalid JSON payload" });
    });

    it("returns 403 when SUPERUSER omits institutionId", async () => {
      authMock.mockResolvedValue({ user: { id: "u8", role: "SUPERUSER", institutionId: 1 } });

      const response = await postShipments(
        jsonRequest("http://localhost/api/shipments", "POST", {
          supplierCode: "LPS",
          shipmentDate: "2026-02-01T00:00:00.000Z",
          arrivalDate: "2026-02-02T00:00:00.000Z",
          items: [
            {
              butterflySpeciesId: 1,
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
      );

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({ error: "Tenant required" });
    });

    it("returns 201 when SUPERUSER provides institutionId", async () => {
      authMock.mockResolvedValue({ user: { id: "u8b", role: "SUPERUSER", institutionId: 1 } });

      (db.select as jest.Mock)
        .mockImplementationOnce(() => makeSelect([{ id: 1 }]))
        .mockImplementationOnce(() => makeSelect([{ code: "LPS" }]))
        .mockImplementationOnce(() => makeSelect([{ id: 1 }]));

      (db.transaction as jest.Mock).mockImplementationOnce(async (callback) =>
        callback({
          insert: jest
            .fn()
            .mockReturnValueOnce({
              values: jest.fn().mockReturnThis(),
              returning: jest.fn().mockResolvedValue([{ id: 99 }]),
            })
            .mockReturnValueOnce({
              values: jest.fn().mockResolvedValue(undefined),
            }),
        }),
      );

      const response = await postShipments(
        jsonRequest("http://localhost/api/shipments", "POST", {
          institutionId: 1,
          supplierCode: "LPS",
          shipmentDate: "2026-02-01T00:00:00.000Z",
          arrivalDate: "2026-02-02T00:00:00.000Z",
          items: [
            {
              butterflySpeciesId: 1,
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
      );

      expect(response.status).toBe(201);
      await expect(response.json()).resolves.toEqual({ id: 99, itemCount: 1 });
    });

    it("returns 400 when supplier is not found", async () => {
      authMock.mockResolvedValue({ user: { id: "u4", role: "EMPLOYEE", institutionId: 1 } });

      (db.select as jest.Mock).mockImplementationOnce(() => makeSelect([]));

      const response = await postShipments(
        jsonRequest("http://localhost/api/shipments", "POST", {
          supplierCode: "LPS",
          shipmentDate: "2026-02-01T00:00:00.000Z",
          arrivalDate: "2026-02-02T00:00:00.000Z",
          items: [
            {
              butterflySpeciesId: 1,
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
      );

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({ error: "Supplier not found" });
    });

    it("returns 201 on successful create", async () => {
      authMock.mockResolvedValue({ user: { id: "u5", role: "EMPLOYEE", institutionId: 1 } });

      (db.select as jest.Mock)
        .mockImplementationOnce(() => makeSelect([{ code: "LPS" }]))
        .mockImplementationOnce(() => makeSelect([{ id: 1 }]));

      (db.transaction as jest.Mock).mockImplementationOnce(async (callback) =>
        callback({
          insert: jest
            .fn()
            .mockReturnValueOnce({
              values: jest.fn().mockReturnThis(),
              returning: jest.fn().mockResolvedValue([{ id: 88 }]),
            })
            .mockReturnValueOnce({
              values: jest.fn().mockResolvedValue(undefined),
            }),
        }),
      );

      const response = await postShipments(
        jsonRequest("http://localhost/api/shipments", "POST", {
          supplierCode: "LPS",
          shipmentDate: "2026-02-01T00:00:00.000Z",
          arrivalDate: "2026-02-02T00:00:00.000Z",
          items: [
            {
              butterflySpeciesId: 1,
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
      );

      expect(response.status).toBe(201);
      await expect(response.json()).resolves.toEqual({ id: 88, itemCount: 1 });
    });
  });
});
