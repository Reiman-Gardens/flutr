import { auth } from "@/auth";
import { requireUser, canReadSuppliers } from "@/lib/authz";
import { resolveTenantBySlug } from "@/lib/tenant";
import { listSuppliersForTenant } from "@/lib/queries/suppliers";

export async function getTenantSuppliers({ slug }: { slug: string }) {
  const user = requireUser(await auth());
  if (!canReadSuppliers(user)) throw new Error("FORBIDDEN");
  const tenantId = await resolveTenantBySlug(user, slug);
  return listSuppliersForTenant(tenantId);
}
