export type SupplierOption = {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
};

type SupplierApiRow = {
  id?: unknown;
  code?: unknown;
  name?: unknown;
  isActive?: unknown;
  is_active?: unknown;
};

export function mapSupplierRowsToOptions(rows: unknown): SupplierOption[] {
  if (!Array.isArray(rows)) return [];

  return rows
    .map((row): SupplierOption | null => {
      const supplier = row as SupplierApiRow;
      const id = typeof supplier.id === "number" ? supplier.id : Number(supplier.id);
      const code = typeof supplier.code === "string" ? supplier.code.trim() : "";

      if (!Number.isFinite(id) || id <= 0 || !code) return null;

      const name =
        typeof supplier.name === "string" && supplier.name.trim() ? supplier.name.trim() : code;
      const isActive =
        typeof supplier.isActive === "boolean"
          ? supplier.isActive
          : typeof supplier.is_active === "boolean"
            ? supplier.is_active
            : true;

      return {
        id,
        code,
        name,
        isActive,
      };
    })
    .filter((supplier): supplier is SupplierOption => supplier !== null);
}
