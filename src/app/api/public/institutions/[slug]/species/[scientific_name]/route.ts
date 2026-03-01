import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { butterfly_species, butterfly_species_institution, institutions } from "@/lib/schema";
import { getInstitutionSpeciesDetailParamsSchema } from "@/lib/validation/institution";

function formatZodIssues(issues: { path: PropertyKey[]; message: string }[]) {
  return issues.map((issue) => ({
    path: issue.path.filter((value) => typeof value !== "symbol").join("."),
    message: issue.message,
  }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; scientific_name: string }> },
) {
  const resolvedParams = await params;
  const parsed = getInstitutionSpeciesDetailParamsSchema.safeParse(resolvedParams);

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

    const [species] = await db
      .select({
        scientific_name: butterfly_species.scientific_name,
        common_name: butterfly_species.common_name,
        common_name_override: butterfly_species_institution.common_name_override,
        lifespan_days: butterfly_species.lifespan_days,
        lifespan_override: butterfly_species_institution.lifespan_override,
        family: butterfly_species.family,
        sub_family: butterfly_species.sub_family,
        range: butterfly_species.range,
        description: butterfly_species.description,
        host_plant: butterfly_species.host_plant,
        habitat: butterfly_species.habitat,
        fun_facts: butterfly_species.fun_facts,
        img_wings_open: butterfly_species.img_wings_open,
        img_wings_closed: butterfly_species.img_wings_closed,
        extra_img_1: butterfly_species.extra_img_1,
        extra_img_2: butterfly_species.extra_img_2,
      })
      .from(butterfly_species)
      .leftJoin(
        butterfly_species_institution,
        and(
          eq(butterfly_species_institution.butterfly_species_id, butterfly_species.id),
          eq(butterfly_species_institution.institution_id, institution.id),
        ),
      )
      .where(eq(butterfly_species.scientific_name, parsed.data.scientific_name))
      .limit(1);

    if (!species) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const images = [
      species.img_wings_open,
      species.img_wings_closed,
      species.extra_img_1,
      species.extra_img_2,
    ].filter((value): value is string => typeof value === "string" && value.length > 0);

    return NextResponse.json({
      scientific_name: species.scientific_name,
      common_name: species.common_name_override ?? species.common_name,
      lifespan_days: species.lifespan_override ?? species.lifespan_days,
      family: species.family,
      sub_family: species.sub_family,
      range: species.range,
      description: species.description,
      host_plant: species.host_plant,
      habitat: species.habitat,
      fun_facts: species.fun_facts,
      images,
    });
  } catch (error) {
    logger.error("Failed to load institution species detail", error);
    return NextResponse.json({ error: "Unable to load species detail" }, { status: 500 });
  }
}
