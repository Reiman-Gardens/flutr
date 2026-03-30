import { dayIndex } from "@/lib/utils";

describe("dayIndex", () => {
  it("returns a value between 0 and length - 1", () => {
    const result = dayIndex(10);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThan(10);
  });

  it("returns 0 for length of 1", () => {
    expect(dayIndex(1)).toBe(0);
  });

  it("returns the same value when called twice in the same millisecond window", () => {
    const a = dayIndex(5);
    const b = dayIndex(5);
    expect(a).toBe(b);
  });

  it("cycles deterministically based on mocked date", () => {
    // Day 0 from epoch: Jan 1, 1970 00:00:00 UTC
    jest.spyOn(Date, "now").mockReturnValue(0);
    expect(dayIndex(7)).toBe(0);

    // Day 1
    jest.spyOn(Date, "now").mockReturnValue(86_400_000);
    expect(dayIndex(7)).toBe(1);

    // Day 7 wraps back to 0
    jest.spyOn(Date, "now").mockReturnValue(86_400_000 * 7);
    expect(dayIndex(7)).toBe(0);

    // Day 10 = 10 % 3 = 1
    jest.spyOn(Date, "now").mockReturnValue(86_400_000 * 10);
    expect(dayIndex(3)).toBe(1);

    jest.restoreAllMocks();
  });

  it("stays stable within the same UTC day", () => {
    // Start of a day
    jest.spyOn(Date, "now").mockReturnValue(86_400_000 * 5);
    const morning = dayIndex(10);

    // End of same day (just before midnight)
    jest.spyOn(Date, "now").mockReturnValue(86_400_000 * 5 + 86_399_999);
    const evening = dayIndex(10);

    expect(morning).toBe(evening);

    jest.restoreAllMocks();
  });
});
