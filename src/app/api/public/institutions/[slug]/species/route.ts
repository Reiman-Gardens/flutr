import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { butterfly_species, butterfly_species_institution, institutions } from "@/lib/schema";
import { getInstitutionBySlugSchema } from "@/lib/validation/institution";

function formatZodIssues(issues: { path: PropertyKey[]; message: string }[]) {
  return issues.map((issue) => ({
    path: issue.path.filter((value) => typeof value !== "symbol").join("."),
    message: issue.message,
  }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const parsed = getInstitutionBySlugSchema.safeParse({ slug: resolvedParams.slug });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: formatZodIssues(parsed.error.issues) },
      { status: 400 },
    );
  }

  try {
    const [institution] = await db
      .select({ id: institutions.id })
      .from(institutions)
      .where(eq(institutions.slug, parsed.data.slug))
      .limit(1);

    if (!institution) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const rows = await db
      .select({
        scientific_name: butterfly_species.scientific_name,
        common_name: butterfly_species.common_name,
        common_name_override: butterfly_species_institution.common_name_override,
        lifespan_days: butterfly_species.lifespan_days,
        lifespan_override: butterfly_species_institution.lifespan_override,
        family: butterfly_species.family,
        sub_family: butterfly_species.sub_family,
        img_wings_open: butterfly_species.img_wings_open,
        img_wings_closed: butterfly_species.img_wings_closed,
      })
      .from(butterfly_species_institution)
      .innerJoin(
        butterfly_species,
        eq(butterfly_species_institution.butterfly_species_id, butterfly_species.id),
      )
      .where(eq(butterfly_species_institution.institution_id, institution.id));

    const result = rows.map((species) => ({
      scientific_name: species.scientific_name,
      common_name: species.common_name_override ?? species.common_name,
      lifespan_days: species.lifespan_override ?? species.lifespan_days,
      family: species.family,
      sub_family: species.sub_family,
      image_url: species.img_wings_open ?? species.img_wings_closed,
    }));

    return NextResponse.json(result);
  } catch (error) {
    logger.error("Failed to load institution species", error);
    return NextResponse.json({ error: "Unable to load species" }, { status: 500 });
  }
}
