jest.mock("postgres", () => {
  return jest.fn().mockReturnValue({});
});

jest.mock("drizzle-orm/postgres-js", () => ({
  drizzle: jest.fn().mockReturnValue({ query: {} }),
}));

describe("db", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, DATABASE_URL: "postgresql://test:test@localhost:5432/test" };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("exports a db instance", async () => {
    const { db } = await import("@/lib/db");
    expect(db).toBeDefined();
  });

  it("initializes postgres with DATABASE_URL", async () => {
    const postgres = (await import("postgres")).default as unknown as jest.Mock;
    await import("@/lib/db");

    expect(postgres).toHaveBeenCalledWith("postgresql://test:test@localhost:5432/test");
  });

  it("initializes drizzle with client and schema", async () => {
    const { drizzle } = await import("drizzle-orm/postgres-js");
    await import("@/lib/db");

    expect(drizzle).toHaveBeenCalled();
  });
});
