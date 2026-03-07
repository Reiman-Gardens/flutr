import { cache } from "react";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { institutions } from "@/lib/schema";

/** All active institutions for the platform directory. */
export const getActiveInstitutions = cache(async () => {
  return db
    .select({
      slug: institutions.slug,
      name: institutions.name,
      city: institutions.city,
      state_province: institutions.state_province,
      country: institutions.country,
      facility_image_url: institutions.facility_image_url,
      logo_url: institutions.logo_url,
    })
    .from(institutions)
    .where(eq(institutions.stats_active, true));
});
