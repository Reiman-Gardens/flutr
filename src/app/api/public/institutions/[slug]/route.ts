import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { institution_news, institutions } from "@/lib/schema";
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
    const [record] = await db
      .select({
        id: institutions.id,
        slug: institutions.slug,
        name: institutions.name,
        street_address: institutions.street_address,
        extended_address: institutions.extended_address,
        city: institutions.city,
        state_province: institutions.state_province,
        postal_code: institutions.postal_code,
        time_zone: institutions.time_zone,
        country: institutions.country,
        phone_number: institutions.phone_number,
        email_address: institutions.email_address,
        iabes_member: institutions.iabes_member,
        theme_colors: institutions.theme_colors,
        website_url: institutions.website_url,
        facility_image_url: institutions.facility_image_url,
        logo_url: institutions.logo_url,
        description: institutions.description,
        social_links: institutions.social_links,
        stats_active: institutions.stats_active,
      })
      .from(institutions)
      .where(eq(institutions.slug, parsed.data.slug))
      .limit(1);

    if (!record) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const [latestNews] = await db
      .select({
        id: institution_news.id,
        title: institution_news.title,
        content: institution_news.content,
        image_url: institution_news.image_url,
        created_at: institution_news.created_at,
      })
      .from(institution_news)
      .where(
        and(eq(institution_news.institution_id, record.id), eq(institution_news.is_active, true)),
      )
      .orderBy(desc(institution_news.created_at))
      .limit(1);

    return NextResponse.json({
      ...record,
      latestNews: latestNews ?? null,
    });
  } catch (error) {
    logger.error("Failed to load public institution", error);
    return NextResponse.json({ error: "Unable to load institution" }, { status: 500 });
  }
}
