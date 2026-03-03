import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { institutions } from "@/lib/schema";
import { ok, internalError } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    void request;
    const rows = await db
      .select({
        id: institutions.id,
        slug: institutions.slug,
        name: institutions.name,
        city: institutions.city,
        state_province: institutions.state_province,
        country: institutions.country,
        website_url: institutions.website_url,
        facility_image_url: institutions.facility_image_url,
        logo_url: institutions.logo_url,
        stats_active: institutions.stats_active,
      })
      .from(institutions)
      .where(eq(institutions.stats_active, true));

    return ok({ institutions: rows });
  } catch {
    return internalError();
  }
}
