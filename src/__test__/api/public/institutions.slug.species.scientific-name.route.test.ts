import { NextRequest } from "next/server";

import { GET } from "@/app/api/public/institutions/[slug]/species/[scientific_name]/route";
import * as dbModule from "@/lib/db";
import { createThenableQuery } from "@/__test__/api/_utils/mockDb";

jest.mock("@/lib/db");

describe("GET /api/public/institutions/[slug]/species/[scientific_name]", () => {
  const mockDb = dbModule as unknown as {
    db: {
      select: jest.Mock;
    };
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("returns 400 for invalid slug", async () => {
    const res = await GET({} as NextRequest, {
      params: Promise.resolve({
        slug: "Bad Slug",
        scientific_name: "Danaus_plexippus",
      }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid scientific_name", async () => {
    const res = await GET({} as NextRequest, {
      params: Promise.resolve({ slug: "some-slug", scientific_name: "Bad Name" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 404 when institution not found", async () => {
    mockDb.db.select.mockReturnValueOnce(createThenableQuery([]));

    const res = await GET({} as NextRequest, {
      params: Promise.resolve({
        slug: "some-slug",
        scientific_name: "Danaus_plexippus",
      }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 404 when species not found", async () => {
    mockDb.db.select
      .mockReturnValueOnce(createThenableQuery([{ id: 1 }]))
      .mockReturnValueOnce(createThenableQuery([]));

    const res = await GET({} as NextRequest, {
      params: Promise.resolve({
        slug: "some-slug",
        scientific_name: "Danaus_plexippus",
      }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 200 on success", async () => {
    mockDb.db.select
      .mockReturnValueOnce(createThenableQuery([{ id: 1 }]))
      .mockReturnValueOnce(createThenableQuery([{ scientific_name: "Danaus_plexippus" }]));

    const res = await GET({} as NextRequest, {
      params: Promise.resolve({
        slug: "some-slug",
        scientific_name: "Danaus_plexippus",
      }),
    });
    expect(res.status).toBe(200);
  });

  it("returns 500 on internal error", async () => {
    mockDb.db.select.mockImplementationOnce(() => {
      throw new Error("boom");
    });

    const res = await GET({} as NextRequest, {
      params: Promise.resolve({
        slug: "some-slug",
        scientific_name: "Danaus_plexippus",
      }),
    });
    expect(res.status).toBe(500);
  });
});
