import { parseDateOnlyToUtcExclusiveEnd, parseDateOnlyToUtcStart } from "@/lib/queries/shipments";

describe("shipment query date range bounds", () => {
  it("parses YYYY-MM-DD to UTC start-of-day", () => {
    const start = parseDateOnlyToUtcStart("2024-12-31");
    expect(start.toISOString()).toBe("2024-12-31T00:00:00.000Z");
  });

  it("computes exclusive upper bound as next UTC day start", () => {
    const endExclusive = parseDateOnlyToUtcExclusiveEnd("2024-12-31");
    expect(endExclusive.toISOString()).toBe("2025-01-01T00:00:00.000Z");
  });

  it("includes same-day timestamps and excludes next day at midnight", () => {
    const endExclusive = parseDateOnlyToUtcExclusiveEnd("2024-12-31");
    const noonOnToDate = new Date("2024-12-31T12:00:00.000Z");
    const nextMidnight = new Date("2025-01-01T00:00:00.000Z");

    expect(noonOnToDate < endExclusive).toBe(true);
    expect(nextMidnight < endExclusive).toBe(false);
  });
});
