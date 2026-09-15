import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AUTH_ERRORS, requireUser } from "@/lib/authz";
import { getTenantSpecies } from "@/lib/services/tenant-species";
import TenantSpeciesClient from "@/components/tenant/species/tenant-species-client";
import type { TenantSpeciesSummary } from "@/components/tenant/species/species.utils";

export default async function TenantButterfliesPage({
  params,
}: {
  params: Promise<{ institution: string }>;
}) {
  const { institution: slug } = await params;

  const session = await auth();
  try {
    requireUser(session);
  } catch (error) {
    if (error instanceof Error && error.message === AUTH_ERRORS.UNAUTHORIZED) {
      redirect("/login");
    }
    throw error;
  }

  const rows = await getTenantSpecies({ slug });

  const species: TenantSpeciesSummary[] = rows.map((row) => ({
    id: row.id,
    scientificName: row.scientificName,
    family: row.family,
    subFamily: row.subFamily,
    range: row.range,
    commonName: row.commonName,
    commonNameOverride: row.commonNameOverride,
    lifespanDays: row.lifespanDays,
    lifespanOverride: row.lifespanOverride,
    isLinked: row.linkId !== null,
  }));

  return <TenantSpeciesClient species={species} />;
}
