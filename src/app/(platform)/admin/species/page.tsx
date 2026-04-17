import SpeciesClient from "@/components/platform/species/species-client";
import type { PlatformSpeciesSummary } from "@/components/platform/species/species.utils";
import { getPlatformSpecies } from "@/lib/services/platform-species";

export default async function PlatformSpeciesPage() {
  const rawSpecies = await getPlatformSpecies();

  const species: PlatformSpeciesSummary[] = rawSpecies.map((item) => ({
    id: item.id,
    scientificName: item.scientificName,
    commonName: item.commonName,
    family: item.family,
    subFamily: item.subFamily,
    lifespanDays: item.lifespanDays,
    range: item.range,
    createdAt:
      item.createdAt instanceof Date ? item.createdAt.toISOString() : String(item.createdAt),
  }));

  return <SpeciesClient species={species} />;
}
