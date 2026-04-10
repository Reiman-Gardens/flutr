import { auth } from "@/auth";
import { canCreateRelease, canReadShipment, requireUser } from "@/lib/authz";
import {
  createInFlightForRelease,
  deleteInFlightRow,
  deleteReleaseEvent,
  getReleaseEventWithItems,
  listInstitutionReleases,
  RELEASE_ERRORS,
  updateInFlightQuantity,
  updateReleaseEventItems,
} from "@/lib/queries/releases";
import { resolveTenantBySlug } from "@/lib/tenant";

import type {
  CreateInFlightBody,
  UpdateInFlightQuantityBody,
  UpdateReleaseEventItemsBody,
} from "@/lib/validation/releases";

export { RELEASE_ERRORS };

type TenantReleaseContext = {
  slug: string;
};

type ListTenantReleasesInput = TenantReleaseContext & {
  page?: number;
  limit?: number;
};

type TenantReleaseByIdInput = TenantReleaseContext & {
  releaseId: number;
};

type TenantInFlightByIdInput = TenantReleaseContext & {
  inFlightId: number;
};

type CreateTenantReleaseInFlightInput = TenantReleaseByIdInput & CreateInFlightBody;

type UpdateTenantReleaseInput = TenantReleaseByIdInput & UpdateReleaseEventItemsBody;

type UpdateTenantInFlightInput = TenantInFlightByIdInput & UpdateInFlightQuantityBody;

export async function getTenantReleases({ slug, page = 1, limit = 50 }: ListTenantReleasesInput) {
  const user = requireUser(await auth());

  if (!canReadShipment(user)) {
    throw new Error("FORBIDDEN");
  }

  const tenantId = await resolveTenantBySlug(user, slug);
  return listInstitutionReleases(tenantId, page, limit);
}

export async function getTenantReleaseById({ slug, releaseId }: TenantReleaseByIdInput) {
  const user = requireUser(await auth());

  if (!canReadShipment(user)) {
    throw new Error("FORBIDDEN");
  }

  const tenantId = await resolveTenantBySlug(user, slug);

  return getReleaseEventWithItems(tenantId, releaseId);
}

export async function updateTenantRelease(data: UpdateTenantReleaseInput) {
  const user = requireUser(await auth());

  if (!canCreateRelease(user)) {
    throw new Error("FORBIDDEN");
  }

  const { slug, releaseId, ...updateData } = data;
  const tenantId = await resolveTenantBySlug(user, slug);

  return updateReleaseEventItems(tenantId, releaseId, updateData);
}

export async function deleteTenantRelease({ slug, releaseId }: TenantReleaseByIdInput) {
  const user = requireUser(await auth());

  if (!canCreateRelease(user)) {
    throw new Error("FORBIDDEN");
  }

  const tenantId = await resolveTenantBySlug(user, slug);

  return deleteReleaseEvent(tenantId, releaseId);
}

export async function createTenantReleaseInFlight(data: CreateTenantReleaseInFlightInput) {
  const user = requireUser(await auth());

  if (!canCreateRelease(user)) {
    throw new Error("FORBIDDEN");
  }

  const { slug, releaseId, ...createData } = data;
  const tenantId = await resolveTenantBySlug(user, slug);

  return createInFlightForRelease(tenantId, releaseId, createData);
}

export async function updateTenantInFlight(data: UpdateTenantInFlightInput) {
  const user = requireUser(await auth());

  if (!canCreateRelease(user)) {
    throw new Error("FORBIDDEN");
  }

  const { slug, inFlightId, ...updateData } = data;
  const tenantId = await resolveTenantBySlug(user, slug);

  return updateInFlightQuantity(tenantId, inFlightId, updateData);
}

export async function deleteTenantInFlight({ slug, inFlightId }: TenantInFlightByIdInput) {
  const user = requireUser(await auth());

  if (!canCreateRelease(user)) {
    throw new Error("FORBIDDEN");
  }

  const tenantId = await resolveTenantBySlug(user, slug);

  return deleteInFlightRow(tenantId, inFlightId);
}
