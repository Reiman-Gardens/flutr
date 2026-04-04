import { auth } from "@/auth";
import { canManageInstitutionProfile, requireUser } from "@/lib/authz";
import { resolveTenantBySlug } from "@/lib/tenant";
import type {
  ShipmentImportCommitRequest,
  ShipmentImportCommitResponse,
  ShipmentImportPreviewRequest,
  ShipmentImportPreviewResponse,
} from "@/lib/validation/platform-shipment-import";
import {
  buildShipmentImportPreviewForInstitution,
  commitShipmentImportForInstitution,
  exportShipmentWorkbookForInstitution,
} from "@/lib/services/platform-shipment-import";

type TenantShipmentImportContext = {
  slug: string;
};

export async function getTenantShipmentImportPreview(
  data: TenantShipmentImportContext & ShipmentImportPreviewRequest,
): Promise<ShipmentImportPreviewResponse> {
  const user = requireUser(await auth());
  if (!canManageInstitutionProfile(user)) throw new Error("FORBIDDEN");

  const tenantId = await resolveTenantBySlug(user, data.slug);
  const { raw_text, source } = data;

  return buildShipmentImportPreviewForInstitution({
    institutionId: tenantId,
    raw_text,
    source,
  });
}

export async function commitTenantShipmentImport(
  data: TenantShipmentImportContext & ShipmentImportCommitRequest,
): Promise<ShipmentImportCommitResponse> {
  const user = requireUser(await auth());
  if (!canManageInstitutionProfile(user)) throw new Error("FORBIDDEN");

  const tenantId = await resolveTenantBySlug(user, data.slug);
  const { preview_hash, shipments, options } = data;

  return commitShipmentImportForInstitution({
    institutionId: tenantId,
    preview_hash,
    shipments,
    options: {
      ...options,
      // Tenant admins cannot create global species records.
      allow_species_autocreate: false,
    },
  });
}

export async function exportTenantShipmentWorkbook({
  slug,
}: TenantShipmentImportContext): Promise<Buffer> {
  const user = requireUser(await auth());
  if (!canManageInstitutionProfile(user)) throw new Error("FORBIDDEN");

  const tenantId = await resolveTenantBySlug(user, slug);
  return exportShipmentWorkbookForInstitution({ institutionId: tenantId });
}
