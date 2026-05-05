import SuppliersClient from "@/components/platform/suppliers/suppliers-client";
import type { PlatformSupplierSummary } from "@/components/platform/suppliers/suppliers.utils";
import { getPlatformSuppliers } from "@/lib/services/platform-suppliers";

export default async function PlatformSuppliersPage() {
  const rawSuppliers = await getPlatformSuppliers();

  const suppliers: PlatformSupplierSummary[] = rawSuppliers.map((supplier) => ({
    id: supplier.id,
    name: supplier.name,
    code: supplier.code,
    country: supplier.country,
    websiteUrl: supplier.websiteUrl,
    isActive: supplier.isActive,
    createdAt:
      supplier.createdAt instanceof Date
        ? supplier.createdAt.toISOString()
        : String(supplier.createdAt),
  }));

  return <SuppliersClient suppliers={suppliers} />;
}
