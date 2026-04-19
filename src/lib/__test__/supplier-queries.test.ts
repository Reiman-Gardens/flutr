const mockLimit = jest.fn();
const mockWhere = jest.fn(() => ({ limit: mockLimit }));
const mockFrom = jest.fn(() => ({ where: mockWhere }));
const mockSelect = jest.fn(() => ({ from: mockFrom }));
const mockReturning = jest.fn();
const mockOnConflictDoNothing = jest.fn(() => ({ returning: mockReturning }));
const mockValues = jest.fn(() => ({ onConflictDoNothing: mockOnConflictDoNothing }));
const mockInsert = jest.fn(() => ({ values: mockValues }));

jest.mock("@/lib/db", () => ({
  db: {
    select: mockSelect,
    insert: mockInsert,
  },
}));

import { ensureSupplierExistsForGlobalImport } from "@/lib/queries/suppliers";

describe("supplier queries", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("ensureSupplierExistsForGlobalImport", () => {
    it("auto-creates missing import suppliers using the exact trimmed code", async () => {
      mockLimit.mockResolvedValueOnce([]);
      mockReturning.mockResolvedValueOnce([{ id: 42, code: "lps historical" }]);

      const supplier = await ensureSupplierExistsForGlobalImport(" lps historical ", {
        name: "lps historical",
        country: "Unknown",
        websiteUrl: null,
      });

      expect(mockValues).toHaveBeenCalledWith({
        code: "lps historical",
        name: "lps historical",
        country: "Unknown",
        website_url: null,
        is_active: false,
      });
      expect(supplier).toEqual({
        id: 42,
        code: "lps historical",
        wasGloballyMissing: true,
      });
    });

    it("returns the existing row when a concurrent insert wins the race", async () => {
      // Initial select: no match
      mockLimit.mockResolvedValueOnce([]);
      // onConflictDoNothing insert: no-op (concurrent process inserted first)
      mockReturning.mockResolvedValueOnce([]);
      // Re-select: finds the row inserted by the other process
      mockLimit.mockResolvedValueOnce([{ id: 42, code: "lps historical" }]);

      const supplier = await ensureSupplierExistsForGlobalImport(" lps historical ", {
        name: "lps historical",
        country: "Unknown",
        websiteUrl: null,
      });

      expect(supplier).toEqual({
        id: 42,
        code: "lps historical",
        wasGloballyMissing: true,
      });
    });
  });
});
