import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { butterfly_species } from "@/lib/schema";

export async function GET() {
  try {
    const rows = await db
      .select({
        scientific_name: butterfly_species.scientific_name,
        common_name: butterfly_species.common_name,
        family: butterfly_species.family,
        sub_family: butterfly_species.sub_family,
        img_wings_open: butterfly_species.img_wings_open,
        img_wings_closed: butterfly_species.img_wings_closed,
      })
      .from(butterfly_species);

    const result = rows.map((species) => ({
      scientific_name: species.scientific_name,
      common_name: species.common_name,
      family: species.family,
      sub_family: species.sub_family,
      image_url: species.img_wings_open ?? species.img_wings_closed,
    }));

    return NextResponse.json(result);
  } catch (error) {
    logger.error("Failed to load public species", error);
    return NextResponse.json({ error: "Unable to load species" }, { status: 500 });
  }
}
