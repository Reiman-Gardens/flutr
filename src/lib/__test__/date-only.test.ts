import {
  dateOnlyToUtcDate,
  extractDateOnly,
  formatDateOnlyForDisplay,
  isDateOnlyString,
} from "@/lib/date-only";

describe("date-only helpers", () => {
  it.each(["2026-09-09", "2026-10-01", "2027-01-01"])(
    "converts %s to the same UTC calendar date",
    (value) => {
      expect(dateOnlyToUtcDate(value).toISOString()).toBe(`${value}T00:00:00.000Z`);
    },
  );

  it("rejects invalid calendar dates", () => {
    expect(isDateOnlyString("2026-02-30")).toBe(false);
    expect(isDateOnlyString("2026-13-01")).toBe(false);
    expect(isDateOnlyString("not-a-date")).toBe(false);
  });

  it("extracts the calendar date from existing ISO timestamps", () => {
    expect(extractDateOnly("2026-09-09T00:00:00.000Z")).toBe("2026-09-09");
  });

  it.each([
    ["2026-09-09", "Sep 09, 2026"],
    ["2026-10-01", "Oct 01, 2026"],
    ["2027-01-01", "Jan 01, 2027"],
  ])("formats %s without local timezone drift", (value, expected) => {
    expect(formatDateOnlyForDisplay(value)).toBe(expected);
    expect(formatDateOnlyForDisplay(`${value}T00:00:00.000Z`)).toBe(expected);
  });
});
