import { NextRequest } from "next/server";

import { GET } from "@/app/api/public/institutions/route";
import * as dbModule from "@/lib/db";
import { createThenableQuery } from "@/__test__/api/_utils/mockDb";

jest.mock("@/lib/db");

describe("GET /api/public/institutions", () => {
  const mockDb = dbModule as unknown as {
    db: {
      select: jest.Mock;
    };
  };

  const mockInstitution = {
    id: 1,
    slug: "test-zoo",
    name: "Test Zoo",
    city: "Springfield",
    state_province: "IL",
    country: "US",
    website_url: null,
    facility_image_url: null,
    logo_url: null,
    stats_active: true,
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  function makeRequest(params: Record<string, string> = {}) {
    return {
      nextUrl: { searchParams: new URLSearchParams(params) },
    } as unknown as NextRequest;
  }

  // ── Success contract ──────────────────────────────────────────────────────

  it("returns 200 with institutions array and pagination metadata", async () => {
    mockDb.db.select
      .mockReturnValueOnce(createThenableQuery([mockInstitution]))
      .mockReturnValueOnce(createThenableQuery([{ total: 1 }]));

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body.institutions)).toBe(true);
    expect(body.institutions).toHaveLength(1);
    expect(body.pagination).toEqual({ page: 1, limit: 50, total: 1, totalPages: 1 });
  });

  it("returns empty institutions array with pagination metadata when no results", async () => {
    mockDb.db.select
      .mockReturnValueOnce(createThenableQuery([]))
      .mockReturnValueOnce(createThenableQuery([{ total: 0 }]));

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.institutions).toEqual([]);
    expect(body.pagination).toEqual({ page: 1, limit: 50, total: 0, totalPages: 1 });
  });

  it("computes totalPages correctly for multi-page results", async () => {
    mockDb.db.select
      .mockReturnValueOnce(createThenableQuery([mockInstitution]))
      .mockReturnValueOnce(createThenableQuery([{ total: 120 }]));

    const res = await GET(makeRequest({ page: "1", limit: "50" }));
    const body = await res.json();
    expect(body.pagination).toEqual({ page: 1, limit: 50, total: 120, totalPages: 3 });
  });

  it("honours explicit page and limit params", async () => {
    mockDb.db.select
      .mockReturnValueOnce(createThenableQuery([]))
      .mockReturnValueOnce(createThenableQuery([{ total: 5 }]));

    const res = await GET(makeRequest({ page: "2", limit: "10" }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.pagination.page).toBe(2);
    expect(body.pagination.limit).toBe(10);
  });

  // ── Validation ────────────────────────────────────────────────────────────

  it("returns 400 on unrecognised query params", async () => {
    const res = await GET(makeRequest({ unexpected: "value" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body?.code ?? body?.error?.code).toBe("INVALID_REQUEST");
  });

  it("returns 400 when page is zero", async () => {
    const res = await GET(makeRequest({ page: "0" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when page is negative", async () => {
    const res = await GET(makeRequest({ page: "-1" }));
    expect(res.status).toBe(400);
  });

  it("caps limit at max (100) when limit exceeds max", async () => {
    mockDb.db.select
      .mockReturnValueOnce(createThenableQuery([]))
      .mockReturnValueOnce(createThenableQuery([{ total: 0 }]));

    const res = await GET(makeRequest({ limit: "101" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.pagination.limit).toBe(100);
  });

  it("returns 400 when limit is zero", async () => {
    const res = await GET(makeRequest({ limit: "0" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when page is non-numeric", async () => {
    const res = await GET(makeRequest({ page: "abc" }));
    expect(res.status).toBe(400);
  });

  // ── Error contract ────────────────────────────────────────────────────────

  it("returns 500 on internal error", async () => {
    mockDb.db.select.mockImplementationOnce(() => {
      throw new Error("boom");
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
  });
});
