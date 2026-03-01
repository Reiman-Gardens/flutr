import { POST as createInFlight } from "@/app/api/releases/[releaseId]/in-flight/route";
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

function makeSelectWithLimit(result: Record<string, unknown>[]) {
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

describe("POST /api/releases/[releaseId]/in-flight", () => {
  beforeEach(() => {
    authMock.mockReset();
    (db.select as jest.Mock).mockReset();
    (db.insert as jest.Mock).mockReset();
    (db.transaction as jest.Mock).mockReset();
    (db.transaction as jest.Mock).mockImplementation(async (callback) =>
      callback({
        select: db.select,
        insert: db.insert,
        execute: jest.fn().mockResolvedValue({}),
      }),
    );
    (logger.error as jest.Mock).mockReset();
  });

  it("returns 401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null);

    const response = await createInFlight(
      new Request("http://localhost/api/releases/10/in-flight", { method: "POST" }),
      { params: Promise.resolve({ releaseId: "10" }) },
    );

    expect(response.status).toBe(401);
  });

  it("returns 403 when forbidden role", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "VIEWER", institutionId: 1 } });

    const response = await createInFlight(
      new Request("http://localhost/api/releases/10/in-flight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shipment_item_id: 5, quantity: 1 }),
      }),
      { params: Promise.resolve({ releaseId: "10" }) },
    );

    expect(response.status).toBe(403);
  });

  it("returns 400 for invalid release id", async () => {
    authMock.mockResolvedValue({ user: { id: "u1b", role: "EMPLOYEE", institutionId: 1 } });

    const response = await createInFlight(
      new Request("http://localhost/api/releases/abc/in-flight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shipment_item_id: 5, quantity: 1 }),
      }),
      { params: Promise.resolve({ releaseId: "abc" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid release id" });
  });

  it("returns 400 for invalid JSON payload", async () => {
    authMock.mockResolvedValue({ user: { id: "u1c", role: "EMPLOYEE", institutionId: 1 } });

    const response = await createInFlight(
      new Request("http://localhost/api/releases/10/in-flight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{",
      }),
      { params: Promise.resolve({ releaseId: "10" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid JSON payload" });
  });

  it("returns 404 when release is missing", async () => {
    authMock.mockResolvedValue({ user: { id: "u2", role: "EMPLOYEE", institutionId: 1 } });
    (db.select as jest.Mock).mockImplementationOnce(() => makeSelectWithLimit([]));

    const response = await createInFlight(
      new Request("http://localhost/api/releases/55/in-flight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shipment_item_id: 7, quantity: 1 }),
      }),
      { params: Promise.resolve({ releaseId: "55" }) },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Release not found" });
  });

  it("returns 400 when shipment item does not match release shipment", async () => {
    authMock.mockResolvedValue({ user: { id: "u3", role: "EMPLOYEE", institutionId: 1 } });

    (db.select as jest.Mock)
      .mockImplementationOnce(() =>
        makeSelectWithLimit([{ id: 10, institution_id: 1, shipment_id: 99 }]),
      )
      .mockImplementationOnce(() =>
        makeSelectWithLimit([
          {
            id: 7,
            institution_id: 1,
            shipment_id: 42,
            number_received: 10,
            damaged_in_transit: 0,
            diseased_in_transit: 0,
            parasite: 0,
            non_emergence: 0,
            poor_emergence: 0,
          },
        ]),
      );

    const response = await createInFlight(
      new Request("http://localhost/api/releases/10/in-flight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shipment_item_id: 7, quantity: 1 }),
      }),
      { params: Promise.resolve({ releaseId: "10" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid shipment_item" });
  });

  it("returns 400 when quantity exceeds remaining", async () => {
    authMock.mockResolvedValue({ user: { id: "u4", role: "EMPLOYEE", institutionId: 1 } });

    (db.select as jest.Mock)
      .mockImplementationOnce(() =>
        makeSelectWithLimit([{ id: 10, institution_id: 1, shipment_id: 42 }]),
      )
      .mockImplementationOnce(() =>
        makeSelectWithLimit([
          {
            id: 7,
            institution_id: 1,
            shipment_id: 42,
            number_received: 10,
            damaged_in_transit: 1,
            diseased_in_transit: 1,
            parasite: 0,
            non_emergence: 1,
            poor_emergence: 0,
          },
        ]),
      )
      .mockImplementationOnce(() => makeSelectWithLimit([{ quantity: 6 }]));

    const response = await createInFlight(
      new Request("http://localhost/api/releases/10/in-flight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shipment_item_id: 7, quantity: 2 }),
      }),
      { params: Promise.resolve({ releaseId: "10" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Quantity exceeds remaining" });
  });

  it("returns 201 on success", async () => {
    authMock.mockResolvedValue({ user: { id: "u5", role: "EMPLOYEE", institutionId: 1 } });

    (db.select as jest.Mock)
      .mockImplementationOnce(() =>
        makeSelectWithLimit([{ id: 10, institution_id: 1, shipment_id: 42 }]),
      )
      .mockImplementationOnce(() =>
        makeSelectWithLimit([
          {
            id: 7,
            institution_id: 1,
            shipment_id: 42,
            number_received: 10,
            damaged_in_transit: 1,
            diseased_in_transit: 1,
            parasite: 0,
            non_emergence: 1,
            poor_emergence: 0,
          },
        ]),
      )
      .mockImplementationOnce(() => makeSelectWithLimit([{ quantity: 2 }]));

    (db.insert as jest.Mock).mockImplementationOnce(() =>
      makeInsert([
        {
          id: 99,
          institution_id: 1,
          release_event_id: 10,
          shipment_item_id: 7,
          quantity: 2,
          created_at: new Date("2026-02-27T00:00:00.000Z"),
          updated_at: new Date("2026-02-27T00:00:00.000Z"),
        },
      ]),
    );

    const response = await createInFlight(
      new Request("http://localhost/api/releases/10/in-flight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shipment_item_id: 7, quantity: 2 }),
      }),
      { params: Promise.resolve({ releaseId: "10" }) },
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.id).toBe(99);
    expect(body.quantity).toBe(2);
  });

  it("returns 400 on second sequential allocation after remaining is fully consumed", async () => {
    authMock.mockResolvedValue({ user: { id: "u7", role: "EMPLOYEE", institutionId: 1 } });

    (db.select as jest.Mock)
      .mockImplementationOnce(() =>
        makeSelectWithLimit([{ id: 10, institution_id: 1, shipment_id: 42 }]),
      )
      .mockImplementationOnce(() =>
        makeSelectWithLimit([
          {
            id: 7,
            institution_id: 1,
            shipment_id: 42,
            number_received: 10,
            damaged_in_transit: 0,
            diseased_in_transit: 0,
            parasite: 0,
            non_emergence: 0,
            poor_emergence: 0,
          },
        ]),
      )
      .mockImplementationOnce(() => makeSelectWithLimit([{ quantity: 0 }]))
      .mockImplementationOnce(() =>
        makeSelectWithLimit([{ id: 10, institution_id: 1, shipment_id: 42 }]),
      )
      .mockImplementationOnce(() =>
        makeSelectWithLimit([
          {
            id: 7,
            institution_id: 1,
            shipment_id: 42,
            number_received: 10,
            damaged_in_transit: 0,
            diseased_in_transit: 0,
            parasite: 0,
            non_emergence: 0,
            poor_emergence: 0,
          },
        ]),
      )
      .mockImplementationOnce(() => makeSelectWithLimit([{ quantity: 10 }]));

    (db.insert as jest.Mock).mockImplementationOnce(() =>
      makeInsert([
        {
          id: 120,
          institution_id: 1,
          release_event_id: 10,
          shipment_item_id: 7,
          quantity: 10,
          created_at: new Date("2026-02-27T00:00:00.000Z"),
          updated_at: new Date("2026-02-27T00:00:00.000Z"),
        },
      ]),
    );

    const firstResponse = await createInFlight(
      new Request("http://localhost/api/releases/10/in-flight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shipment_item_id: 7, quantity: 10 }),
      }),
      { params: Promise.resolve({ releaseId: "10" }) },
    );

    expect(firstResponse.status).toBe(201);

    const secondResponse = await createInFlight(
      new Request("http://localhost/api/releases/10/in-flight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shipment_item_id: 7, quantity: 1 }),
      }),
      { params: Promise.resolve({ releaseId: "10" }) },
    );

    expect(secondResponse.status).toBe(400);
    await expect(secondResponse.json()).resolves.toEqual({ error: "Quantity exceeds remaining" });
    expect(db.insert).toHaveBeenCalledTimes(1);
  });

  it("respects tenant scoping and returns 404 for out-of-tenant release", async () => {
    authMock.mockResolvedValue({ user: { id: "u6", role: "EMPLOYEE", institutionId: 2 } });
    (db.select as jest.Mock).mockImplementationOnce(() => makeSelectWithLimit([]));

    const response = await createInFlight(
      new Request("http://localhost/api/releases/10/in-flight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shipment_item_id: 7, quantity: 1 }),
      }),
      { params: Promise.resolve({ releaseId: "10" }) },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Release not found" });
  });
});
