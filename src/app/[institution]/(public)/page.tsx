import { eq, and, sum, isNotNull, countDistinct, exists } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  institutions,
  butterfly_species,
  butterfly_species_institution,
  shipment_items,
  in_flight,
} from "@/lib/schema";
import { HeroSection } from "@/components/public/home/hero-section";
import { FeaturedButterfly } from "@/components/public/home/featured-butterfly";
import { ExploreLinks } from "@/components/public/home/explore-links";

interface InstitutionPageProps {
  params: Promise<{ institution: string }>;
}

export default async function InstitutionPage({ params }: InstitutionPageProps) {
  const { institution: slug } = await params;

  // Resolve institution id + fields needed by this page
  const [inst] = await db
    .select({
      id: institutions.id,
      description: institutions.description,
      facility_image_url: institutions.facility_image_url,
    })
    .from(institutions)
    .where(and(eq(institutions.slug, slug), eq(institutions.stats_active, true)))
    .limit(1);

  if (!inst) return null;

  const basePath = `/${slug}`;

  // Parallel data fetching — stats, species list, and institution details
  const [inFlightResult, speciesRows] = await Promise.all([
    // Total butterflies + distinct species in flight
    db
      .select({
        totalButterflies: sum(in_flight.quantity),
        totalSpecies: countDistinct(shipment_items.butterfly_species_id),
      })
      .from(in_flight)
      .innerJoin(
        shipment_items,
        and(
          eq(in_flight.institution_id, shipment_items.institution_id),
          eq(in_flight.shipment_item_id, shipment_items.id),
        ),
      )
      .where(eq(in_flight.institution_id, inst.id)),

    // Enabled species with images (for Butterfly of the Day)
    // Includes an `is_in_flight` subquery so we don't need a sequential follow-up query
    db
      .select({
        scientific_name: butterfly_species.scientific_name,
        common_name: butterfly_species.common_name,
        img_wings_open: butterfly_species.img_wings_open,
        range: butterfly_species.range,
        lifespan_days: butterfly_species.lifespan_days,
        host_plant: butterfly_species.host_plant,
        is_in_flight: exists(
          db
            .select({ id: in_flight.id })
            .from(in_flight)
            .innerJoin(
              shipment_items,
              and(
                eq(in_flight.institution_id, shipment_items.institution_id),
                eq(in_flight.shipment_item_id, shipment_items.id),
              ),
            )
            .where(
              and(
                eq(in_flight.institution_id, inst.id),
                eq(shipment_items.butterfly_species_id, butterfly_species.id),
              ),
            ),
        ).as("is_in_flight"),
      })
      .from(butterfly_species_institution)
      .innerJoin(
        butterfly_species,
        eq(butterfly_species_institution.butterfly_species_id, butterfly_species.id),
      )
      .where(
        and(
          eq(butterfly_species_institution.institution_id, inst.id),
          isNotNull(butterfly_species.img_wings_open),
        ),
      ),
  ]);

  const totalButterflies = Number(inFlightResult[0]?.totalButterflies ?? 0);
  const totalSpecies = Number(inFlightResult[0]?.totalSpecies ?? 0);

  // Pick a deterministic "Butterfly of the Day" based on the current UTC date
  const featured = speciesRows.length > 0 ? speciesRows[dayIndex(speciesRows.length)] : null;

  return (
    <div>
      {/* Hero + Live Stats */}
      <HeroSection
        description={inst.description}
        facility_image_url={inst.facility_image_url}
        totalButterflies={totalButterflies}
        totalSpecies={totalSpecies}
      />

      {/* Below hero: 2-column on desktop, stacked on mobile */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {featured && (
            <FeaturedButterfly
              slug={slug}
              scientific_name={featured.scientific_name}
              common_name={featured.common_name}
              img_wings_open={featured.img_wings_open}
              range={featured.range}
              lifespan_days={featured.lifespan_days}
              host_plant={featured.host_plant}
              is_in_flight={Boolean(featured.is_in_flight)}
            />
          )}

          <ExploreLinks basePath={basePath} />
        </div>
      </div>
    </div>
  );
}

/** Returns a stable index for today (UTC), cycling through `length` items. */
function dayIndex(length: number): number {
  const daysSinceEpoch = Math.floor(Date.now() / 86_400_000);
  return daysSinceEpoch % length;
}
