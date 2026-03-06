import { POST as createRelease } from "@/app/api/shipments/[id]/releases/route";
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

jest.mock("@/lib/tenant", () => ({
  tenantCondition: jest.fn(),
  ensureTenantExists: jest.fn().mockResolvedValue(undefined),
}));

const authMock = auth as jest.Mock;

function makeSelect(result: Record<string, unknown>[]) {
  return {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(result),
  };
}

function makeInsert(result: Record<string, unknown>[]) {
  return {
    values: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue(result),
  };
}

describe("POST /api/shipments/[shipmentId]/releases", () => {
  beforeEach(() => {
    authMock.mockReset();
    (db.select as jest.Mock).mockReset();
    (db.insert as jest.Mock).mockReset();
    (logger.error as jest.Mock).mockReset();
  });

  it("returns 401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null);

    const response = await createRelease(
      new Request("http://localhost/api/shipments/11/releases", { method: "POST" }),
      { params: Promise.resolve({ id: "11" }) },
    );

    expect(response.status).toBe(401);
  });

  it("returns 403 when role is forbidden", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "VIEWER", institutionId: 1 } });

    const response = await createRelease(
      new Request("http://localhost/api/shipments/11/releases", { method: "POST" }),
      { params: Promise.resolve({ id: "11" }) },
    );

    expect(response.status).toBe(403);
  });

  it("returns 400 for invalid shipment id param", async () => {
    authMock.mockResolvedValue({ user: { id: "u1b", role: "EMPLOYEE", institutionId: 1 } });

    const response = await createRelease(
      new Request("http://localhost/api/shipments/abc/releases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: "abc" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid shipment id" });
  });

  it("returns 400 for malformed JSON", async () => {
    authMock.mockResolvedValue({ user: { id: "u1d", role: "EMPLOYEE", institutionId: 1 } });

    const response = await createRelease(
      new Request("http://localhost/api/shipments/11/releases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not valid json{",
      }),
      { params: Promise.resolve({ id: "11" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid JSON payload" });
  });

  it("returns 400 for invalid body", async () => {
    authMock.mockResolvedValue({ user: { id: "u1c", role: "EMPLOYEE", institutionId: 1 } });

    const response = await createRelease(
      new Request("http://localhost/api/shipments/11/releases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ released_at: "not-a-date" }),
      }),
      { params: Promise.resolve({ id: "11" }) },
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid request");
  });

  it("returns 404 when shipment is not found", async () => {
    authMock.mockResolvedValue({ user: { id: "u2", role: "EMPLOYEE", institutionId: 1 } });
    (db.select as jest.Mock).mockImplementationOnce(() => makeSelect([]));

    const response = await createRelease(
      new Request("http://localhost/api/shipments/22/releases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: "22" }) },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Shipment not found" });
  });

  it("returns 201 on successful create", async () => {
    authMock.mockResolvedValue({
      user: { id: "u3", name: "Ada", role: "EMPLOYEE", institutionId: 1 },
    });

    (db.select as jest.Mock).mockImplementationOnce(() =>
      makeSelect([{ id: 33, institution_id: 1 }]),
    );

    (db.insert as jest.Mock).mockImplementationOnce(() =>
      makeInsert([
        {
          id: 70,
          institution_id: 1,
          shipment_id: 33,
          release_date: new Date("2026-02-27T00:00:00.000Z"),
          released_by: "Ada",
          created_at: new Date("2026-02-27T00:00:00.000Z"),
          updated_at: new Date("2026-02-27T00:00:00.000Z"),
        },
      ]),
    );

    const response = await createRelease(
      new Request("http://localhost/api/shipments/33/releases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ released_at: "2026-02-27T00:00:00.000Z" }),
      }),
      { params: Promise.resolve({ id: "33" }) },
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.id).toBe(70);
    expect(body.shipment_id).toBe(33);
  });

  it("respects tenant scoping and returns 404 for out-of-tenant shipment", async () => {
    authMock.mockResolvedValue({ user: { id: "u4", role: "EMPLOYEE", institutionId: 2 } });
    (db.select as jest.Mock).mockImplementationOnce(() => makeSelect([]));

    const response = await createRelease(
      new Request("http://localhost/api/shipments/99/releases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: "99" }) },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Shipment not found" });
  });
});
