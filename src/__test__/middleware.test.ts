jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

describe("middleware", () => {
  describe("config.matcher", () => {
    it("is defined", async () => {
      const { config } = await import("@/middleware");
      expect(config.matcher).toBeDefined();
      expect(config.matcher).toHaveLength(1);
    });

    it("matches admin routes", async () => {
      const { config } = await import("@/middleware");
      const pattern = config.matcher[0];
      expect(pattern).toBe("/:institution/(admin)/:path*");
    });

    it("does not match public routes by pattern structure", async () => {
      const { config } = await import("@/middleware");
      const pattern = config.matcher[0];
      expect(pattern).not.toContain("(public)");
    });
  });
});
