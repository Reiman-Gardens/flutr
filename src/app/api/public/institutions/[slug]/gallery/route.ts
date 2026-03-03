import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { ZodError } from "zod";

import { db } from "@/lib/db";
import { institutions, butterfly_species_institution, butterfly_species } from "@/lib/schema";
import { internalError, invalidRequest, notFound, ok } from "@/lib/api-response";
import { institutionSlugParamsSchema } from "@/lib/validation/public";

interface RouteContext {
  params: Promise<{
    slug: string;
  }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    void _request;
    const routeParams = await context.params;
    const { slug } = institutionSlugParamsSchema.parse(routeParams);

    const institutionRows = await db
      .select({ id: institutions.id })
      .from(institutions)
      .where(eq(institutions.slug, slug))
      .limit(1);

    if (!institutionRows.length) {
      return notFound("Institution not found");
    }

    const institutionId = institutionRows[0].id;

    const rows = await db
      .select({
        speciesId: butterfly_species.id,
        scientific_name: butterfly_species.scientific_name,
        common_name: butterfly_species.common_name,
        common_name_override: butterfly_species_institution.common_name_override,
        img_wings_open: butterfly_species.img_wings_open,
        img_wings_closed: butterfly_species.img_wings_closed,
        extra_img_1: butterfly_species.extra_img_1,
        extra_img_2: butterfly_species.extra_img_2,
      })
      .from(butterfly_species_institution)
      .innerJoin(
        butterfly_species,
        eq(butterfly_species_institution.butterfly_species_id, butterfly_species.id),
      )
      .where(eq(butterfly_species_institution.institution_id, institutionId));

    return ok({ gallery: rows });
  } catch (error) {
    if (error instanceof ZodError) {
      return invalidRequest("Invalid request", error.issues);
    }

    return internalError();
  }
}
