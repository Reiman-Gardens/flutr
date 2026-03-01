import { GET as getInstitution, PATCH as patchInstitution } from "@/app/api/institution/route";
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

describe("PATCH /api/institution", () => {
  beforeEach(() => {
    authMock.mockReset();
    (db.select as jest.Mock).mockReset();
    (db.update as jest.Mock).mockReset();
    (logger.error as jest.Mock).mockReset();
  });

  it("returns 401 unauthenticated", async () => {
    authMock.mockResolvedValue(null);

    const response = await patchInstitution(
      new Request("http://localhost/api/institution", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated" }),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("returns 403 for employee", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "EMPLOYEE", institutionId: 1 } });

    const response = await patchInstitution(
      new Request("http://localhost/api/institution", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated" }),
      }),
    );

    expect(response.status).toBe(403);
  });

  it("returns 404 for wrong tenant", async () => {
    authMock.mockResolvedValue({ user: { id: "u2", role: "ADMIN", institutionId: 2 } });
    (db.select as jest.Mock).mockImplementationOnce(() => makeSelect([]));

    const response = await patchInstitution(
      new Request("http://localhost/api/institution", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated" }),
      }),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Institution not found" });
  });

  it("returns 200 on successful update", async () => {
    authMock.mockResolvedValue({ user: { id: "u3", role: "ADMIN", institutionId: 1 } });

    (db.select as jest.Mock).mockImplementationOnce(() => makeSelect([{ id: 1 }]));
    (db.update as jest.Mock).mockImplementationOnce(() =>
      makeUpdate([
        {
          id: 1,
          slug: "monarch-house",
          name: "Updated Name",
          street_address: "123 Lane",
          extended_address: null,
          city: "Austin",
          state_province: "TX",
          postal_code: "78701",
          time_zone: "America/Chicago",
          country: "USA",
          phone_number: null,
          email_address: null,
          iabes_member: false,
          theme_colors: [],
          website_url: null,
          facility_image_url: null,
          logo_url: null,
          description: null,
          social_links: null,
          stats_active: true,
          created_at: new Date("2026-02-28T00:00:00.000Z"),
          updated_at: new Date("2026-02-28T00:00:00.000Z"),
        },
      ]),
    );

    const response = await patchInstitution(
      new Request("http://localhost/api/institution", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated Name" }),
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.id).toBe(1);
    expect(body.name).toBe("Updated Name");
  });

  it("partial update only modifies provided fields", async () => {
    authMock.mockResolvedValue({ user: { id: "u4", role: "ORG_SUPERUSER", institutionId: 1 } });

    (db.select as jest.Mock).mockImplementationOnce(() => makeSelect([{ id: 1 }]));
    const setMock = jest.fn().mockReturnThis();
    const whereMock = jest.fn().mockReturnThis();
    const returningMock = jest.fn().mockResolvedValue([
      {
        id: 1,
        slug: "monarch-house",
        name: "Monarch House",
        city: "Houston",
      },
    ]);
    (db.update as jest.Mock).mockImplementationOnce(() => ({
      set: setMock,
      where: whereMock,
      returning: returningMock,
    }));

    const response = await patchInstitution(
      new Request("http://localhost/api/institution", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city: "Houston" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(setMock).toHaveBeenCalledTimes(1);
    const setArg = setMock.mock.calls[0][0];
    expect(setArg.city).toBe("Houston");
    expect(setArg.updated_at).toBeInstanceOf(Date);
    expect(setArg).not.toHaveProperty("name");
  });

  it("slug cannot be changed", async () => {
    authMock.mockResolvedValue({ user: { id: "u5", role: "ADMIN", institutionId: 1 } });

    const response = await patchInstitution(
      new Request("http://localhost/api/institution", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: "new-slug" }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("id cannot be changed", async () => {
    authMock.mockResolvedValue({ user: { id: "u6", role: "ADMIN", institutionId: 1 } });

    const response = await patchInstitution(
      new Request("http://localhost/api/institution", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: 999 }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 for empty PATCH body", async () => {
    authMock.mockResolvedValue({ user: { id: "u7", role: "ADMIN", institutionId: 1 } });

    const response = await patchInstitution(
      new Request("http://localhost/api/institution", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid request");
  });
});

describe("GET /api/institution", () => {
  beforeEach(() => {
    authMock.mockReset();
    (db.select as jest.Mock).mockReset();
    (logger.error as jest.Mock).mockReset();
  });

  it("returns 401 unauthenticated", async () => {
    authMock.mockResolvedValue(null);

    const response = await getInstitution();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns 403 for employee", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "EMPLOYEE", institutionId: 1 } });

    const response = await getInstitution();

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
  });

  it("returns 404 for wrong tenant", async () => {
    authMock.mockResolvedValue({ user: { id: "u2", role: "ADMIN", institutionId: 2 } });
    (db.select as jest.Mock).mockImplementationOnce(() => makeSelect([]));

    const response = await getInstitution();

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Institution not found" });
  });

  it("returns 200 with institution payload for allowed tenant", async () => {
    authMock.mockResolvedValue({ user: { id: "u3", role: "ORG_SUPERUSER", institutionId: 1 } });

    (db.select as jest.Mock).mockImplementationOnce(() =>
      makeSelect([
        {
          id: 1,
          slug: "monarch-house",
          name: "Monarch House",
        },
      ]),
    );

    const response = await getInstitution();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      id: 1,
      slug: "monarch-house",
      name: "Monarch House",
    });
  });
});
