import { DELETE as deleteInFlight } from "@/app/api/in-flight/[id]/route";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { in_flight } from "@/lib/schema";
import { tenantCondition } from "@/lib/tenant";

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  db: {
    select: jest.fn(),
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

jest.mock("@/lib/tenant", () => ({
  tenantCondition: jest.fn(),
  ensureTenantExists: jest.fn().mockResolvedValue(undefined),
}));

const authMock = auth as jest.Mock;
const tenantConditionMock = tenantCondition as jest.Mock;

function makeSelect(result: Record<string, unknown>[]) {
  return {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(result),
  };
}

function makeDelete() {
  return {
    where: jest.fn().mockResolvedValue(undefined),
  };
}

describe("DELETE /api/in-flight/[id]", () => {
  beforeEach(() => {
    authMock.mockReset();
    tenantConditionMock.mockReset();
    tenantConditionMock.mockReturnValue(undefined);
    (db.select as jest.Mock).mockReset();
    (db.delete as jest.Mock).mockReset();
    (logger.error as jest.Mock).mockReset();
  });

  it("returns 401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null);

    const response = await deleteInFlight(
      new Request("http://localhost/api/in-flight/10", { method: "DELETE" }),
      { params: Promise.resolve({ id: "10" }) },
    );

    expect(response.status).toBe(401);
  });

  it("returns 403 when unauthorized role", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "VIEWER", institutionId: 1 } });

    const response = await deleteInFlight(
      new Request("http://localhost/api/in-flight/10", { method: "DELETE" }),
      { params: Promise.resolve({ id: "10" }) },
    );

    expect(response.status).toBe(403);
  });

  it("returns 400 for invalid in-flight id", async () => {
    authMock.mockResolvedValue({ user: { id: "u1b", role: "EMPLOYEE", institutionId: 1 } });

    const response = await deleteInFlight(
      new Request("http://localhost/api/in-flight/abc", { method: "DELETE" }),
      { params: Promise.resolve({ id: "abc" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid in-flight id" });
  });

  it("returns 404 for wrong-tenant or missing row", async () => {
    authMock.mockResolvedValue({ user: { id: "u2", role: "EMPLOYEE", institutionId: 2 } });
    (db.select as jest.Mock).mockImplementationOnce(() => makeSelect([]));

    const response = await deleteInFlight(
      new Request("http://localhost/api/in-flight/99", { method: "DELETE" }),
      { params: Promise.resolve({ id: "99" }) },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "In-flight row not found" });
  });

  it("returns 204 on success", async () => {
    authMock.mockResolvedValue({ user: { id: "u3", role: "EMPLOYEE", institutionId: 1 } });
    (db.select as jest.Mock).mockImplementationOnce(() =>
      makeSelect([{ id: 10, institution_id: 1 }]),
    );
    (db.delete as jest.Mock).mockImplementationOnce(() => makeDelete());

    const response = await deleteInFlight(
      new Request("http://localhost/api/in-flight/10", { method: "DELETE" }),
      { params: Promise.resolve({ id: "10" }) },
    );

    expect(response.status).toBe(204);
  });

  it("ensures tenantCondition is respected", async () => {
    const actor = { id: "u4", role: "EMPLOYEE", institutionId: 1 };
    authMock.mockResolvedValue({ user: actor });
    (db.select as jest.Mock).mockImplementationOnce(() =>
      makeSelect([{ id: 10, institution_id: 1 }]),
    );
    (db.delete as jest.Mock).mockImplementationOnce(() => makeDelete());

    const response = await deleteInFlight(
      new Request("http://localhost/api/in-flight/10", { method: "DELETE" }),
      { params: Promise.resolve({ id: "10" }) },
    );

    expect(response.status).toBe(204);
    expect(tenantConditionMock).toHaveBeenCalledWith(actor, in_flight.institution_id);
  });
});
