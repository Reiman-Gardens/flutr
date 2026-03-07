import { getInitials } from "@/components/public/root-home/institution-card";

describe("getInitials", () => {
  it("extracts first letter of each word (max 2)", () => {
    expect(getInitials("Butterfly World")).toBe("BW");
  });

  it("returns single initial for single-word name", () => {
    expect(getInitials("Zoo")).toBe("Z");
  });

  it("takes only the first 2 words", () => {
    expect(getInitials("The San Diego Zoo")).toBe("TS");
  });

  it("handles extra spaces between words", () => {
    expect(getInitials("  Spaced   Name  ")).toBe("SN");
  });

  it("uppercases lowercase input", () => {
    expect(getInitials("magic wings")).toBe("MW");
  });

  it("returns empty string for empty name", () => {
    expect(getInitials("")).toBe("");
  });

  it("returns empty string for whitespace-only name", () => {
    expect(getInitials("   ")).toBe("");
  });
});
