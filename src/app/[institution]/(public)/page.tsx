import { notFound } from "next/navigation";
import { getPublicInstitution } from "@/lib/queries/institution";
import { getInstitutionHomeData, getPublicNewsPreview } from "@/lib/queries/home";
import { dayIndex } from "@/lib/utils";
import { HeroSection } from "@/components/public/home/hero-section";
import { FeaturedButterfly } from "@/components/public/home/featured-butterfly";
import { ExploreLinks } from "@/components/public/home/explore-links";
import { NewsSection } from "@/components/public/home/news-section";

export const dynamic = "force-dynamic";

interface InstitutionPageProps {
  params: Promise<{ institution: string }>;
}

export default async function InstitutionPage({ params }: InstitutionPageProps) {
  const { institution: slug } = await params;

  const inst = await getPublicInstitution(slug);

  if (!inst) notFound();

  const basePath = `/${slug}`;

  const [{ totalButterflies, totalSpecies, speciesRows }, news] = await Promise.all([
    getInstitutionHomeData(inst.id),
    getPublicNewsPreview(inst.id),
  ]);

  // Pick a deterministic "Butterfly of the Day" based on the current UTC date
  const featured = speciesRows.length > 0 ? speciesRows[dayIndex(speciesRows.length)] : null;
  const primaryColor = inst.theme_colors?.[0] ?? "#a78bfa"; // Light purple default

  return (
    <div>
      {/* Hero + Live Stats */}
      <HeroSection
        description={inst.description}
        facility_image_url={inst.facility_image_url}
        totalButterflies={totalButterflies}
        totalSpecies={totalSpecies}
        primaryColor={primaryColor}
      />

      {/* Below hero: 2-column on desktop, stacked on mobile */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className={`grid gap-8 ${featured ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
          {featured && (
            <FeaturedButterfly
              slug={slug}
              scientific_name={featured.scientific_name}
              common_name={featured.common_name}
              img_wings_open={featured.img_wings_open}
              range={featured.range}
              lifespan_days={featured.lifespan_days}
              host_plant={featured.host_plant}
              in_flight_count={Number(featured.in_flight_count)}
            />
          )}

          <div className="flex flex-col gap-8">
            {news && <NewsSection {...news} />}
            <ExploreLinks basePath={basePath} />
          </div>
        </div>
      </div>
    </div>
  );
}
