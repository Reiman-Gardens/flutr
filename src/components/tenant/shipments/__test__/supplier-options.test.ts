import { mapSupplierRowsToOptions } from "@/components/tenant/shipments/supplier-options";

describe("mapSupplierRowsToOptions", () => {
  it("maps camelCase supplier API rows for the shipment supplier dropdown", () => {
    expect(
      mapSupplierRowsToOptions([{ id: 1, code: "EBN", name: "El Bosque Nuevo", isActive: true }]),
    ).toEqual([{ id: 1, code: "EBN", name: "El Bosque Nuevo", isActive: true }]);
  });

  it("accepts snake_case active flags and keeps inactive suppliers visible", () => {
    expect(
      mapSupplierRowsToOptions([
        { id: "2", code: " LPSS ", name: " Legacy Supplier ", is_active: false },
      ]),
    ).toEqual([{ id: 2, code: "LPSS", name: "Legacy Supplier", isActive: false }]);
  });

  it("drops malformed rows instead of poisoning the dropdown", () => {
    expect(
      mapSupplierRowsToOptions([
        { id: 0, code: "BAD", name: "Bad" },
        { id: 3, code: "", name: "Missing Code" },
        { id: 4, code: "LPS" },
      ]),
    ).toEqual([{ id: 4, code: "LPS", name: "LPS", isActive: true }]);
  });
});
