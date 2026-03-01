import { GET as getSuppliers } from "@/app/api/suppliers/route";
import { auth } from "@/auth";
import { db } from "@/lib/db";

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  db: {
    select: jest.fn(),
  },
}));

const authMock = auth as jest.Mock;

function makeSelect(result: Record<string, unknown>[]) {
  return {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockResolvedValue(result),
    then: (resolve: (value: Record<string, unknown>[]) => void) =>
      Promise.resolve(result).then(resolve),
  };
}

describe("GET /api/suppliers", () => {
  beforeEach(() => {
    authMock.mockReset();
    (db.select as jest.Mock).mockReset();
  });

  it("returns 401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null);

    const response = await getSuppliers(new Request("http://localhost/api/suppliers"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns 403 when role is forbidden", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "UNKNOWN", institutionId: 1 } });

    const response = await getSuppliers(new Request("http://localhost/api/suppliers"));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
  });

  it("returns 403 on cross-tenant override attempt", async () => {
    authMock.mockResolvedValue({ user: { id: "u2", role: "EMPLOYEE", institutionId: 1 } });

    const response = await getSuppliers(
      new Request("http://localhost/api/suppliers?institutionId=2"),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
  });

  it("returns 200 with supplier rows", async () => {
    authMock.mockResolvedValue({ user: { id: "u3", role: "EMPLOYEE", institutionId: 1 } });
    (db.select as jest.Mock).mockImplementationOnce(() =>
      makeSelect([
        {
          id: 1,
          name: "Live Pupae Supply",
          code: "LPS",
          country: "USA",
          websiteUrl: null,
          isActive: true,
        },
      ]),
    );

    const response = await getSuppliers(new Request("http://localhost/api/suppliers"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([
      {
        id: 1,
        name: "Live Pupae Supply",
        code: "LPS",
        country: "USA",
        websiteUrl: null,
        isActive: true,
      },
    ]);
  });

  it("treats invalid institutionId query as absent and still succeeds", async () => {
    authMock.mockResolvedValue({ user: { id: "u4", role: "EMPLOYEE", institutionId: 1 } });
    (db.select as jest.Mock).mockImplementationOnce(() => makeSelect([]));

    const response = await getSuppliers(
      new Request("http://localhost/api/suppliers?institutionId=abc"),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([]);
  });
});
