export interface PlatformSupplierSummary {
  id: number;
  name: string;
  code: string;
  country: string;
  websiteUrl: string | null;
  isActive: boolean;
  createdAt: string;
}

export type PlatformSupplierRecord = PlatformSupplierSummary;

type SupplierApiRecord = {
  id: number;
  name: string;
  code: string;
  country: string;
  websiteUrl: string | null;
  isActive: boolean;
  createdAt: string | Date;
};

export function normalizePlatformSupplier(record: SupplierApiRecord): PlatformSupplierRecord {
  return {
    id: record.id,
    name: record.name,
    code: record.code,
    country: record.country,
    websiteUrl: record.websiteUrl,
    isActive: record.isActive,
    createdAt: toIsoString(record.createdAt),
  };
}

export function toPlatformSupplierSummary(record: PlatformSupplierRecord): PlatformSupplierSummary {
  return {
    id: record.id,
    name: record.name,
    code: record.code,
    country: record.country,
    websiteUrl: record.websiteUrl,
    isActive: record.isActive,
    createdAt: record.createdAt,
  };
}

export function filterSuppliers(
  suppliers: PlatformSupplierSummary[],
  search: string,
  showInactive: boolean,
) {
  const normalizedSearch = search.trim().toLowerCase();

  return [...suppliers]
    .filter((supplier) => {
      if (!showInactive && !supplier.isActive) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [supplier.name, supplier.code, supplier.country, supplier.websiteUrl ?? ""].some(
        (value) => value.toLowerCase().includes(normalizedSearch),
      );
    })
    .sort(compareSuppliers);
}

export function compareSuppliers(a: PlatformSupplierSummary, b: PlatformSupplierSummary) {
  if (a.isActive !== b.isActive) {
    return a.isActive ? -1 : 1;
  }

  const codeCompare = a.code.localeCompare(b.code);
  if (codeCompare !== 0) {
    return codeCompare;
  }

  return a.name.localeCompare(b.name);
}

function toIsoString(value: string | Date) {
  return value instanceof Date ? value.toISOString() : value;
}
