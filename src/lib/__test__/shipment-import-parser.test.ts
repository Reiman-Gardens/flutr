import {
  detectShipmentImportHeaderKey,
  groupShipmentImportRows,
  parseExcelDateToIso,
  parseShipmentImportRows,
  splitDelimitedLine,
} from "@/lib/shipment-import-parser";

describe("shipment-import-parser", () => {
  describe("detectShipmentImportHeaderKey", () => {
    it("maps supported aliases", () => {
      expect(detectShipmentImportHeaderKey("No. rec")).toBe("numberReceived");
      expect(detectShipmentImportHeaderKey("Ship date")).toBe("shipDate");
      expect(detectShipmentImportHeaderKey("No disea")).toBe("diseasedInTransit");
      expect(detectShipmentImportHeaderKey("No parasit")).toBe("parasite");
      expect(detectShipmentImportHeaderKey("Poor emerg")).toBe("poorEmergence");
    });
  });

  describe("splitDelimitedLine", () => {
    it("supports quoted delimiters", () => {
      const cells = splitDelimitedLine('"A, value",B,C', ",");
      expect(cells).toEqual(["A, value", "B", "C"]);
    });
  });

  describe("parseExcelDateToIso", () => {
    it("parses excel serial dates", () => {
      const iso = parseExcelDateToIso("46013");
      expect(iso).toBeTruthy();
      expect(iso?.slice(0, 10)).toBe("2025-12-22");
    });

    it("parses m/d/yy", () => {
      const iso = parseExcelDateToIso("12/9/25");
      expect(iso?.slice(0, 10)).toBe("2025-12-09");
    });

    it("returns null for invalid date", () => {
      expect(parseExcelDateToIso("13/99/2025")).toBeNull();
    });
  });

  describe("parseShipmentImportRows", () => {
    it("returns error for missing required headers", () => {
      const input = ["Species,Supplier,Ship date", "Caligo atreus,EBN,12/9/25"].join("\n");
      const result = parseShipmentImportRows(input);

      expect(result.rows).toHaveLength(0);
      expect(result.rowErrors[0]).toContain("Missing required columns");
    });

    it("parses rows and normalizes arrival date when needed", () => {
      const input = [
        "Species,No. rec,Supplier,Ship date,Arrival date,Emerg. in tr,Damag in tr,No. disea,No. parasit,No emerg,Poor emerg",
        "Caligo atreus,10,EBN,12/11/25,12/09/25,0,0,0,0,1,0",
      ].join("\n");

      const result = parseShipmentImportRows(input);

      expect(result.rowErrors).toHaveLength(0);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]?.scientificName).toBe("caligo atreus");
      expect(result.rows[0]?.arrivalDate).toBe(result.rows[0]?.shipmentDate);
      expect(
        result.warnings.some((warning) =>
          warning.includes("Arrival date was before shipment date and was normalized"),
        ),
      ).toBe(true);
    });

    it("treats blank No. rec as 0 for legacy compatibility", () => {
      const input = [
        "Species,No. rec,Supplier,Ship date,Arrival date,Emerg. in tr,Damag in tr,No. disea,No. parasit,No emerg,Poor emerg",
        "Caligo atreus,,EBN,12/11/25,12/11/25,0,0,0,0,1,0",
      ].join("\n");

      const result = parseShipmentImportRows(input);

      expect(result.rowErrors).toHaveLength(0);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]?.numberReceived).toBe(0);
      expect(result.warnings).toContain("Row 2: No. rec was blank and defaulted to 0.");
    });

    it("warns when metric headers are missing and defaults them to 0", () => {
      const input = [
        "Species,No. rec,Supplier,Ship date,Arrival date,No emerg",
        "Caligo atreus,10,EBN,12/11/25,12/11/25,1",
      ].join("\n");

      const result = parseShipmentImportRows(input);

      expect(result.rowErrors).toHaveLength(0);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]?.emergedInTransit).toBe(0);
      expect(result.warnings.some((warning) => warning.startsWith("Missing metric columns"))).toBe(
        true,
      );
    });
  });

  describe("groupShipmentImportRows", () => {
    it("groups by supplier+dates and aggregates duplicate species rows", () => {
      const parseResult = parseShipmentImportRows(
        [
          "Species,No. rec,Supplier,Ship date,Arrival date,No emerg,No parasit",
          "Caligo atreus,10,EBN,12/9/25,12/11/25,1,2",
          "Caligo atreus,5,EBN,12/9/25,12/11/25,3,1",
        ].join("\n"),
      );

      expect(parseResult.rowErrors).toHaveLength(0);

      const grouped = groupShipmentImportRows(parseResult.rows);
      expect(grouped).toHaveLength(1);
      expect(grouped[0]?.items).toHaveLength(1);
      expect(grouped[0]?.items[0]?.scientific_name).toBe("caligo atreus");
      expect(grouped[0]?.items[0]?.number_received).toBe(15);
      expect(grouped[0]?.items[0]?.non_emergence).toBe(4);
      expect(grouped[0]?.items[0]?.parasite).toBe(3);
    });
  });
});
