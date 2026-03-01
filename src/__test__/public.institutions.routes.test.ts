import { GET as getInstitutionBySlug } from "@/app/api/public/institutions/[slug]/route";
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
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(result),
  };
}

describe("Public institutions API route", () => {
  beforeEach(() => {
    authMock.mockReset();
    (db.select as jest.Mock).mockReset();
    (logger.error as jest.Mock).mockReset();
  });

  it("returns 404 when slug is not found", async () => {
    (db.select as jest.Mock).mockImplementationOnce(() => makeSelect([]));

    const response = await getInstitutionBySlug(
      new Request("http://localhost/api/public/institutions/missing"),
      {
        params: Promise.resolve({ slug: "missing" }),
      },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Not found" });
  });

  it("returns 200 with safe public fields when found", async () => {
    (db.select as jest.Mock)
      .mockImplementationOnce(() =>
        makeSelect([
          {
            id: 1,
            slug: "monarch-house",
            name: "Monarch House",
            street_address: "123 Butterfly Ln",
            extended_address: null,
            city: "Austin",
            state_province: "TX",
            postal_code: "78701",
            time_zone: "America/Chicago",
            country: "USA",
            phone_number: "555-0100",
            email_address: "info@monarch.example",
            iabes_member: true,
            theme_colors: ["#111111", "#222222"],
            website_url: "https://monarch.example",
            facility_image_url: null,
            logo_url: null,
            description: "Public butterfly house",
            social_links: { instagram: "@monarch" },
            stats_active: true,
          },
        ]),
      )
      .mockImplementationOnce(() =>
        makeSelect([
          {
            id: 99,
            title: "Nathan's Note",
            content: "Welcome to the butterfly house",
            image_url: "https://example.com/news.jpg",
            created_at: new Date("2026-02-01T00:00:00.000Z"),
          },
        ]),
      );

    const response = await getInstitutionBySlug(
      new Request("http://localhost/api/public/institutions/monarch-house"),
      { params: Promise.resolve({ slug: "monarch-house" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      id: 1,
      slug: "monarch-house",
      name: "Monarch House",
      street_address: "123 Butterfly Ln",
      extended_address: null,
      city: "Austin",
      state_province: "TX",
      postal_code: "78701",
      time_zone: "America/Chicago",
      country: "USA",
      phone_number: "555-0100",
      email_address: "info@monarch.example",
      iabes_member: true,
      theme_colors: ["#111111", "#222222"],
      website_url: "https://monarch.example",
      facility_image_url: null,
      logo_url: null,
      description: "Public butterfly house",
      social_links: { instagram: "@monarch" },
      stats_active: true,
      latestNews: {
        id: 99,
        title: "Nathan's Note",
        content: "Welcome to the butterfly house",
        image_url: "https://example.com/news.jpg",
        created_at: "2026-02-01T00:00:00.000Z",
      },
    });
    expect(body).not.toHaveProperty("created_at");
    expect(body).not.toHaveProperty("updated_at");
  });

  it("returns latestNews as null when no active news exists", async () => {
    (db.select as jest.Mock)
      .mockImplementationOnce(() =>
        makeSelect([
          {
            id: 1,
            slug: "monarch-house",
            name: "Monarch House",
            street_address: "123 Butterfly Ln",
            extended_address: null,
            city: "Austin",
            state_province: "TX",
            postal_code: "78701",
            time_zone: "America/Chicago",
            country: "USA",
            phone_number: "555-0100",
            email_address: "info@monarch.example",
            iabes_member: true,
            theme_colors: ["#111111", "#222222"],
            website_url: "https://monarch.example",
            facility_image_url: null,
            logo_url: null,
            description: "Public butterfly house",
            social_links: { instagram: "@monarch" },
            stats_active: true,
          },
        ]),
      )
      .mockImplementationOnce(() => makeSelect([]));

    const response = await getInstitutionBySlug(
      new Request("http://localhost/api/public/institutions/monarch-house"),
      { params: Promise.resolve({ slug: "monarch-house" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.latestNews).toBeNull();
  });

  it("does not require auth", async () => {
    (db.select as jest.Mock).mockImplementationOnce(() => makeSelect([]));

    const response = await getInstitutionBySlug(
      new Request("http://localhost/api/public/institutions/no-auth"),
      {
        params: Promise.resolve({ slug: "no-auth" }),
      },
    );

    expect(response.status).toBe(404);
    expect(authMock).not.toHaveBeenCalled();
  });
});
