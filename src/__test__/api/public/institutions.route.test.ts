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

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("returns 200 on success", async () => {
    mockDb.db.select.mockReturnValueOnce(createThenableQuery([]));
    const request = {
      nextUrl: {
        searchParams: new URLSearchParams(),
      },
    } as unknown as NextRequest;

    const res = await GET(request);
    expect(res.status).toBe(200);
  });

  it("returns 400 on invalid query params", async () => {
    const request = {
      nextUrl: {
        searchParams: new URLSearchParams({ unexpected: "value" }),
      },
    } as unknown as NextRequest;

    const res = await GET(request);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body?.code ?? body?.error?.code).toBe("INVALID_REQUEST");
  });
  it("returns 500 on internal error", async () => {
    mockDb.db.select.mockImplementationOnce(() => {
      throw new Error("boom");
    });
    const request = {
      nextUrl: {
        searchParams: new URLSearchParams(),
      },
    } as unknown as NextRequest;

    const res = await GET(request);
    expect(res.status).toBe(500);
  });
});
