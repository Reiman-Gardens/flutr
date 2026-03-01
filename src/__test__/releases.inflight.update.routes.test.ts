import { PATCH as updateInFlight } from "@/app/api/in-flight/[id]/route";
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
  };
}

function makeUpdate(result: Record<string, unknown>[]) {
  return {
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue(result),
  };
}

describe("PATCH /api/in-flight/[id]", () => {
  beforeEach(() => {
    authMock.mockReset();
    (db.select as jest.Mock).mockReset();
    (db.update as jest.Mock).mockReset();
    (db.transaction as jest.Mock).mockReset();
    (db.transaction as jest.Mock).mockImplementation(async (callback) =>
      callback({
        select: db.select,
        update: db.update,
        execute: jest.fn().mockResolvedValue({}),
      }),
    );
    (logger.error as jest.Mock).mockReset();
  });

  it("returns 401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null);

    const response = await updateInFlight(
      new Request("http://localhost/api/in-flight/10", { method: "PATCH" }),
      { params: Promise.resolve({ id: "10" }) },
    );

    expect(response.status).toBe(401);
  });

  it("returns 403 when forbidden", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "VIEWER", institutionId: 1 } });

    const response = await updateInFlight(
      new Request("http://localhost/api/in-flight/10", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: 1 }),
      }),
      { params: Promise.resolve({ id: "10" }) },
    );

    expect(response.status).toBe(403);
  });

  it("returns 400 for invalid in-flight id", async () => {
    authMock.mockResolvedValue({ user: { id: "u1b", role: "EMPLOYEE", institutionId: 1 } });

    const response = await updateInFlight(
      new Request("http://localhost/api/in-flight/abc", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: 1 }),
      }),
      { params: Promise.resolve({ id: "abc" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid in-flight id" });
  });

  it("returns 400 for invalid JSON payload", async () => {
    authMock.mockResolvedValue({ user: { id: "u1c", role: "EMPLOYEE", institutionId: 1 } });

    const response = await updateInFlight(
      new Request("http://localhost/api/in-flight/10", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: "{",
      }),
      { params: Promise.resolve({ id: "10" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid JSON payload" });
  });

  it("returns 404 when row is not found", async () => {
    authMock.mockResolvedValue({ user: { id: "u2", role: "EMPLOYEE", institutionId: 1 } });
    (db.select as jest.Mock).mockImplementationOnce(() => makeSelect([]));

    const response = await updateInFlight(
      new Request("http://localhost/api/in-flight/10", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: 1 }),
      }),
      { params: Promise.resolve({ id: "10" }) },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "In-flight row not found" });
  });

  it("returns 400 when quantity exceeds remaining", async () => {
    authMock.mockResolvedValue({ user: { id: "u3", role: "EMPLOYEE", institutionId: 1 } });

    (db.select as jest.Mock)
      .mockImplementationOnce(() =>
        makeSelect([{ id: 50, institution_id: 1, shipment_item_id: 7 }]),
      )
      .mockImplementationOnce(() =>
        makeSelect([
          {
            id: 7,
            number_received: 10,
            damaged_in_transit: 1,
            diseased_in_transit: 1,
            parasite: 0,
            non_emergence: 1,
            poor_emergence: 0,
          },
        ]),
      )
      .mockImplementationOnce(() => makeSelect([{ quantity: 6 }]));

    const response = await updateInFlight(
      new Request("http://localhost/api/in-flight/50", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: 3 }),
      }),
      { params: Promise.resolve({ id: "50" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Quantity exceeds remaining" });
  });

  it("returns 200 on success", async () => {
    authMock.mockResolvedValue({ user: { id: "u4", role: "EMPLOYEE", institutionId: 1 } });

    (db.select as jest.Mock)
      .mockImplementationOnce(() =>
        makeSelect([{ id: 50, institution_id: 1, shipment_item_id: 7 }]),
      )
      .mockImplementationOnce(() =>
        makeSelect([
          {
            id: 7,
            number_received: 10,
            damaged_in_transit: 1,
            diseased_in_transit: 1,
            parasite: 0,
            non_emergence: 1,
            poor_emergence: 0,
          },
        ]),
      )
      .mockImplementationOnce(() => makeSelect([{ quantity: 2 }]));

    (db.update as jest.Mock).mockImplementationOnce(() =>
      makeUpdate([
        {
          id: 50,
          institution_id: 1,
          release_event_id: 10,
          shipment_item_id: 7,
          quantity: 4,
          created_at: new Date("2026-02-27T00:00:00.000Z"),
          updated_at: new Date("2026-02-27T00:00:00.000Z"),
        },
      ]),
    );

    const response = await updateInFlight(
      new Request("http://localhost/api/in-flight/50", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: 4 }),
      }),
      { params: Promise.resolve({ id: "50" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.id).toBe(50);
    expect(body.quantity).toBe(4);
  });

  it("excludes current row when aggregating remaining quantity", async () => {
    authMock.mockResolvedValue({ user: { id: "u5", role: "EMPLOYEE", institutionId: 1 } });

    (db.select as jest.Mock)
      .mockImplementationOnce(() =>
        makeSelect([{ id: 50, institution_id: 1, shipment_item_id: 7 }]),
      )
      .mockImplementationOnce(() =>
        makeSelect([
          {
            id: 7,
            number_received: 10,
            damaged_in_transit: 0,
            diseased_in_transit: 0,
            parasite: 0,
            non_emergence: 0,
            poor_emergence: 0,
          },
        ]),
      )
      .mockImplementationOnce(() => makeSelect([{ quantity: 6 }]));

    (db.update as jest.Mock).mockImplementationOnce(() =>
      makeUpdate([
        {
          id: 50,
          institution_id: 1,
          release_event_id: 10,
          shipment_item_id: 7,
          quantity: 4,
          created_at: new Date("2026-02-27T00:00:00.000Z"),
          updated_at: new Date("2026-02-27T00:00:00.000Z"),
        },
      ]),
    );

    const response = await updateInFlight(
      new Request("http://localhost/api/in-flight/50", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: 4 }),
      }),
      { params: Promise.resolve({ id: "50" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.quantity).toBe(4);
  });

  it("returns 400 on second sequential allocation update after remaining is fully consumed", async () => {
    authMock.mockResolvedValue({ user: { id: "u6", role: "EMPLOYEE", institutionId: 1 } });

    (db.select as jest.Mock)
      .mockImplementationOnce(() =>
        makeSelect([{ id: 50, institution_id: 1, shipment_item_id: 7 }]),
      )
      .mockImplementationOnce(() =>
        makeSelect([
          {
            id: 7,
            number_received: 10,
            damaged_in_transit: 0,
            diseased_in_transit: 0,
            parasite: 0,
            non_emergence: 0,
            poor_emergence: 0,
          },
        ]),
      )
      .mockImplementationOnce(() => makeSelect([{ quantity: 0 }]))
      .mockImplementationOnce(() =>
        makeSelect([{ id: 51, institution_id: 1, shipment_item_id: 7 }]),
      )
      .mockImplementationOnce(() =>
        makeSelect([
          {
            id: 7,
            number_received: 10,
            damaged_in_transit: 0,
            diseased_in_transit: 0,
            parasite: 0,
            non_emergence: 0,
            poor_emergence: 0,
          },
        ]),
      )
      .mockImplementationOnce(() => makeSelect([{ quantity: 10 }]));

    (db.update as jest.Mock).mockImplementationOnce(() =>
      makeUpdate([
        {
          id: 50,
          institution_id: 1,
          release_event_id: 10,
          shipment_item_id: 7,
          quantity: 10,
          created_at: new Date("2026-02-27T00:00:00.000Z"),
          updated_at: new Date("2026-02-27T00:00:00.000Z"),
        },
      ]),
    );

    const firstResponse = await updateInFlight(
      new Request("http://localhost/api/in-flight/50", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: 10 }),
      }),
      { params: Promise.resolve({ id: "50" }) },
    );

    expect(firstResponse.status).toBe(200);

    const secondResponse = await updateInFlight(
      new Request("http://localhost/api/in-flight/51", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: 1 }),
      }),
      { params: Promise.resolve({ id: "51" }) },
    );

    expect(secondResponse.status).toBe(400);
    await expect(secondResponse.json()).resolves.toEqual({ error: "Quantity exceeds remaining" });
    expect(db.update).toHaveBeenCalledTimes(1);
  });
});
