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

    const res = await GET({} as NextRequest);
    expect(res.status).toBe(200);
  });

  it("returns 500 on internal error", async () => {
    mockDb.db.select.mockImplementationOnce(() => {
      throw new Error("boom");
    });

    const res = await GET({} as NextRequest);
    expect(res.status).toBe(500);
  });
});
