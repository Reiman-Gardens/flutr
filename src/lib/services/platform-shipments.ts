import { auth } from "@/auth";
import { canCrossTenant, requireUser } from "@/lib/authz";
import {
  deleteShipmentsForInstitution,
  getShipmentSummaryList,
  type ShipmentDeleteOptions,
} from "@/lib/queries/shipments";
import { ensureTenantExists, TENANT_ERRORS } from "@/lib/tenant";

type PlatformInstitutionInput = {
  institutionId: number;
};

async function assertPlatformShipmentAccess(institutionId: number) {
  const user = requireUser(await auth());

  if (!canCrossTenant(user)) throw new Error("FORBIDDEN");

  try {
    await ensureTenantExists(institutionId);
  } catch (error) {
    if (error instanceof Error && error.message === TENANT_ERRORS.INSTITUTION_NOT_FOUND) {
      throw new Error("NOT_FOUND");
    }
    throw error;
  }
}

export async function getPlatformShipmentSummary({ institutionId }: PlatformInstitutionInput) {
  await assertPlatformShipmentAccess(institutionId);

  const rows = await getShipmentSummaryList(institutionId);
  return { shipments: rows };
}

export async function deletePlatformShipments({
  institutionId,
  options,
}: PlatformInstitutionInput & { options: ShipmentDeleteOptions }) {
  await assertPlatformShipmentAccess(institutionId);

  return deleteShipmentsForInstitution(institutionId, options);
}
