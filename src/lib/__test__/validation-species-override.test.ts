import { MAX_LIFESPAN_DAYS, updateSpeciesOverrideBodySchema } from "@/lib/validation/species";

describe("updateSpeciesOverrideBodySchema", () => {
  it("rejects a lifespan above the PostgreSQL integer range", () => {
    // Regression: 2147483648 used to pass validation and fail inside PostgreSQL
    // with a 500 instead of a field-level validation error.
    const result = updateSpeciesOverrideBodySchema.safeParse({
      lifespan_override: MAX_LIFESPAN_DAYS + 1,
    });
    expect(result.success).toBe(false);
  });

  it("accepts the maximum lifespan", () => {
    const result = updateSpeciesOverrideBodySchema.safeParse({
      lifespan_override: MAX_LIFESPAN_DAYS,
    });
    expect(result.success).toBe(true);
  });

  it("rejects zero and negative lifespans", () => {
    expect(updateSpeciesOverrideBodySchema.safeParse({ lifespan_override: 0 }).success).toBe(false);
    expect(updateSpeciesOverrideBodySchema.safeParse({ lifespan_override: -1 }).success).toBe(
      false,
    );
  });

  it("normalizes a blank common name to null so reads never resolve to an empty string", () => {
    const result = updateSpeciesOverrideBodySchema.safeParse({ common_name_override: "   " });
    expect(result.success).toBe(true);
    expect(result.success && result.data.common_name_override).toBeNull();
  });

  it("allows clearing an override with an explicit null", () => {
    const result = updateSpeciesOverrideBodySchema.safeParse({ lifespan_override: null });
    expect(result.success).toBe(true);
    expect(result.success && result.data.lifespan_override).toBeNull();
  });
});
