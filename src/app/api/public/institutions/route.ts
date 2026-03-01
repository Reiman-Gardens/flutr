import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { institutions } from "@/lib/schema";

export async function GET() {
  try {
    const rows = await db
      .select({
        id: institutions.id,
        slug: institutions.slug,
        name: institutions.name,
        street_address: institutions.street_address,
        city: institutions.city,
        state_province: institutions.state_province,
        postal_code: institutions.postal_code,
        facility_image_url: institutions.facility_image_url,
        logo_url: institutions.logo_url,
        country: institutions.country,
      })
      .from(institutions);

    return NextResponse.json(rows);
  } catch (error) {
    logger.error("Failed to load public institutions", error);
    return NextResponse.json({ error: "Unable to load institutions" }, { status: 500 });
  }
}
