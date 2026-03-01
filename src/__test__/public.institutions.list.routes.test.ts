import { GET as getPublicInstitutions } from "@/app/api/public/institutions/route";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  db: {
    select: jest.fn(),
  },
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

const authMock = auth as jest.Mock;

type SelectResult = Record<string, unknown>[];

function makeSelect(result: SelectResult) {
  return {
    from: jest.fn().mockResolvedValue(result),
  };
}

describe("Public institutions list API route", () => {
  beforeEach(() => {
    authMock.mockReset();
    (db.select as jest.Mock).mockReset();
    (logger.error as jest.Mock).mockReset();
  });

  it("returns 200 with empty array when no institutions exist", async () => {
    (db.select as jest.Mock).mockImplementationOnce(() => makeSelect([]));

    const response = await getPublicInstitutions();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([]);
  });

  it("returns 200 with expected listing fields only", async () => {
    (db.select as jest.Mock).mockImplementationOnce(() =>
      makeSelect([
        {
          id: 1,
          slug: "monarch-house",
          name: "Monarch House",
          street_address: "123 Butterfly Ln",
          city: "Austin",
          state_province: "TX",
          postal_code: "78701",
          facility_image_url: "https://example.com/facility.jpg",
          logo_url: "https://example.com/logo.png",
          country: "USA",
        },
      ]),
    );

    const response = await getPublicInstitutions();

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body).toEqual([
      {
        id: 1,
        slug: "monarch-house",
        name: "Monarch House",
        street_address: "123 Butterfly Ln",
        city: "Austin",
        state_province: "TX",
        postal_code: "78701",
        facility_image_url: "https://example.com/facility.jpg",
        logo_url: "https://example.com/logo.png",
        country: "USA",
      },
    ]);

    expect(body[0]).not.toHaveProperty("email_address");
    expect(body[0]).not.toHaveProperty("phone_number");
    expect(body[0]).not.toHaveProperty("theme_colors");
    expect(body[0]).not.toHaveProperty("social_links");
    expect(body[0]).not.toHaveProperty("stats_active");
    expect(body[0]).not.toHaveProperty("created_at");
    expect(body[0]).not.toHaveProperty("updated_at");
    expect(body[0]).not.toHaveProperty("description");
  });

  it("does not require authentication", async () => {
    (db.select as jest.Mock).mockImplementationOnce(() => makeSelect([]));

    const response = await getPublicInstitutions();

    expect(response.status).toBe(200);
    expect(authMock).not.toHaveBeenCalled();
  });
});
