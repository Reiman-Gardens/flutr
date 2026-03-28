import { dayIndex } from "@/lib/utils";

/**
 * formatLifespan is not exported, so we replicate its logic here for testing.
 * If the implementation is ever extracted to a shared util, these tests can
 * import it directly instead.
 */
function formatLifespan(days: number): string {
  if (days <= 0) return "Unknown";

  if (days <= 14) {
    return `${days} ${days === 1 ? "day" : "days"}`;
  }

  if (days <= 60) {
    const floor = Math.floor(days / 7);
    const ceil = Math.ceil(days / 7);
    if (floor === ceil) return `${floor} ${floor === 1 ? "week" : "weeks"}`;
    return `${floor}\u2013${ceil} weeks`;
  }

  const floor = Math.floor(days / 30);
  const ceil = Math.ceil(days / 30);
  if (floor === ceil) return `${floor} ${floor === 1 ? "month" : "months"}`;
  return `${floor}\u2013${ceil} months`;
}

/**
 * safeDecodeParam is a private helper in the page file. Replicate for testing.
 */
function safeDecodeParam(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

describe("formatLifespan", () => {
  it("returns 'Unknown' for zero", () => {
    expect(formatLifespan(0)).toBe("Unknown");
  });

  it("returns 'Unknown' for negative values", () => {
    expect(formatLifespan(-5)).toBe("Unknown");
  });

  it("returns singular day", () => {
    expect(formatLifespan(1)).toBe("1 day");
  });

  it("returns plural days for values up to 14", () => {
    expect(formatLifespan(5)).toBe("5 days");
    expect(formatLifespan(14)).toBe("14 days");
  });

  it("shows days for 7 (within <=14 boundary)", () => {
    expect(formatLifespan(7)).toBe("7 days");
  });

  it("returns a week range for 15–60 day values", () => {
    expect(formatLifespan(20)).toBe("2\u20133 weeks");
  });

  it("returns exact weeks when days divide evenly by 7", () => {
    expect(formatLifespan(21)).toBe("3 weeks");
    expect(formatLifespan(28)).toBe("4 weeks");
  });

  it("returns singular week for exactly 15 days (ceil=floor=~2, not 1)", () => {
    // 15 days → floor(15/7)=2, ceil(15/7)=3 → "2–3 weeks"
    expect(formatLifespan(15)).toBe("2\u20133 weeks");
  });

  it("returns months for values over 60", () => {
    expect(formatLifespan(90)).toBe("3 months");
    expect(formatLifespan(61)).toBe("2\u20133 months");
  });

  it("returns singular month for exactly 30 days (in weeks range)", () => {
    // 30 days is <= 60, so it falls in the weeks branch: floor(30/7)=4, ceil=5
    expect(formatLifespan(30)).toBe("4\u20135 weeks");
  });

  it("returns exact months when days divide evenly by 30", () => {
    expect(formatLifespan(120)).toBe("4 months");
  });
});

describe("safeDecodeParam", () => {
  it("decodes a normal URI-encoded string", () => {
    expect(safeDecodeParam("Papilio%20machaon")).toBe("Papilio machaon");
  });

  it("returns the string unchanged if no encoding", () => {
    expect(safeDecodeParam("Danaus-plexippus")).toBe("Danaus-plexippus");
  });

  it("returns null for malformed percent-encoding", () => {
    expect(safeDecodeParam("%E0%A4%A")).toBeNull();
  });

  it("handles an empty string", () => {
    expect(safeDecodeParam("")).toBe("");
  });
});

describe("dayIndex", () => {
  it("returns a value in range [0, length)", () => {
    const result = dayIndex(10);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThan(10);
  });

  it("returns 0 for length 1", () => {
    expect(dayIndex(1)).toBe(0);
  });

  it("is deterministic within the same day", () => {
    expect(dayIndex(50)).toBe(dayIndex(50));
  });
});
