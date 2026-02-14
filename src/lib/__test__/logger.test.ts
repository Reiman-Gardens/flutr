describe("logger", () => {
  const originalEnv = (process.env as { NODE_ENV?: string }).NODE_ENV;

  beforeEach(() => {
    jest.resetModules();
    jest.spyOn(console, "log").mockImplementation();
    jest.spyOn(console, "warn").mockImplementation();
    jest.spyOn(console, "error").mockImplementation();
    jest.spyOn(console, "info").mockImplementation();
  });

  afterEach(() => {
    (process.env as { NODE_ENV?: string }).NODE_ENV = originalEnv;
    jest.restoreAllMocks();
  });

  describe("in development", () => {
    beforeEach(() => {
      (process.env as { NODE_ENV?: string }).NODE_ENV = "development";
    });

    it("logs messages", async () => {
      const { logger } = await import("@/lib/logger");
      logger.log("test");
      expect(console.log).toHaveBeenCalledWith("test");
    });

    it("warns messages", async () => {
      const { logger } = await import("@/lib/logger");
      logger.warn("warning");
      expect(console.warn).toHaveBeenCalledWith("warning");
    });

    it("errors messages", async () => {
      const { logger } = await import("@/lib/logger");
      logger.error("error");
      expect(console.error).toHaveBeenCalledWith("error");
    });

    it("infos messages", async () => {
      const { logger } = await import("@/lib/logger");
      logger.info("info");
      expect(console.info).toHaveBeenCalledWith("info");
    });

    it("passes multiple arguments", async () => {
      const { logger } = await import("@/lib/logger");
      logger.log("msg", { key: "value" }, 42);
      expect(console.log).toHaveBeenCalledWith("msg", { key: "value" }, 42);
    });
  });

  describe("in production", () => {
    beforeEach(() => {
      (process.env as { NODE_ENV?: string }).NODE_ENV = "production";
    });

    it("does not log", async () => {
      const { logger } = await import("@/lib/logger");
      logger.log("test");
      expect(console.log).not.toHaveBeenCalled();
    });

    it("does not warn", async () => {
      const { logger } = await import("@/lib/logger");
      logger.warn("test");
      expect(console.warn).not.toHaveBeenCalled();
    });

    it("does not error", async () => {
      const { logger } = await import("@/lib/logger");
      logger.error("test");
      expect(console.error).not.toHaveBeenCalled();
    });

    it("does not info", async () => {
      const { logger } = await import("@/lib/logger");
      logger.info("test");
      expect(console.info).not.toHaveBeenCalled();
    });
  });
});
