import { cache } from "react";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { butterfly_species, butterfly_species_institution } from "@/lib/schema";

export interface GallerySpecies {
  id: number;
  scientific_name: string;
  common_name: string;
  family: string;
  range: string[];
  img_wings_open: string | null;
}

/** Gallery species for an institution, with overrides resolved. */
export const getGalleryData = cache(async (institutionId: number) => {
  const rows = await db
    .select({
      id: butterfly_species.id,
      scientific_name: butterfly_species.scientific_name,
      common_name: butterfly_species.common_name,
      common_name_override: butterfly_species_institution.common_name_override,
      family: butterfly_species.family,
      range: butterfly_species.range,
      img_wings_open: butterfly_species.img_wings_open,
    })
    .from(butterfly_species_institution)
    .innerJoin(
      butterfly_species,
      eq(butterfly_species_institution.butterfly_species_id, butterfly_species.id),
    )
    .where(eq(butterfly_species_institution.institution_id, institutionId))
    .orderBy(butterfly_species.common_name);

  const species: GallerySpecies[] = rows.map((row) => ({
    id: row.id,
    scientific_name: row.scientific_name,
    common_name: row.common_name_override ?? row.common_name,
    family: row.family,
    range: row.range,
    img_wings_open: row.img_wings_open,
  }));

  return { species };
});
