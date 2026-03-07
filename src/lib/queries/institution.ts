import { cache } from "react";
import { eq, and } from "drizzle-orm";

import { db } from "@/lib/db";
import { institutions } from "@/lib/schema";

/**
 * Cached institution lookup by slug.
 * React's `cache()` deduplicates calls within a single server request,
 * so the layout and page share the same result without hitting the DB twice.
 */
export const getPublicInstitution = cache(async (slug: string) => {
  const [row] = await db
    .select({
      id: institutions.id,
      name: institutions.name,
      description: institutions.description,
      street_address: institutions.street_address,
      extended_address: institutions.extended_address,
      city: institutions.city,
      state_province: institutions.state_province,
      postal_code: institutions.postal_code,
      country: institutions.country,
      email_address: institutions.email_address,
      phone_number: institutions.phone_number,
      website_url: institutions.website_url,
      logo_url: institutions.logo_url,
      facility_image_url: institutions.facility_image_url,
      social_links: institutions.social_links,
    })
    .from(institutions)
    .where(and(eq(institutions.slug, slug), eq(institutions.stats_active, true)))
    .limit(1);

  return row ?? null;
});
