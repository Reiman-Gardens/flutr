import { readableForeground, relativeLuminance } from "@/lib/theme-color";

describe("relativeLuminance", () => {
  it("returns 0 for black and 1 for white", () => {
    expect(relativeLuminance("#000000")).toBeCloseTo(0, 5);
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 5);
  });

  it("rejects values that are not #rrggbb", () => {
    expect(relativeLuminance("#fff")).toBeNull();
    expect(relativeLuminance("teal")).toBeNull();
    expect(relativeLuminance("")).toBeNull();
  });
});

describe("readableForeground", () => {
  it("pairs dark theme colors with white text", () => {
    expect(readableForeground("#4f46e5")).toBe("#ffffff"); // Indigo preset
    expect(readableForeground("#475569")).toBe("#ffffff"); // Slate preset
    expect(readableForeground("#000000")).toBe("#ffffff");
  });

  it("pairs light theme colors with dark text", () => {
    // Mid-tone teal reads better against near-black than against white
    // (3.97:1 vs 4.76:1), which is why the threshold is luminance, not hue.
    expect(readableForeground("#0d9488")).toBe("#111111");
    expect(readableForeground("#fde047")).toBe("#111111");
    expect(readableForeground("#ffffff")).toBe("#111111");
  });

  it("returns null for an unparseable color so callers can skip the override", () => {
    expect(readableForeground("not-a-color")).toBeNull();
  });
});
