import { Bug } from "lucide-react";
import { LiveStats } from "@/components/public/home/live-stats";

interface HeroSectionProps {
  description: string | null;
  facility_image_url: string | null;
  totalButterflies: number;
  totalSpecies: number;
}

export function HeroSection({
  description,
  facility_image_url,
  totalButterflies,
  totalSpecies,
}: HeroSectionProps) {
  return (
    <section aria-labelledby="hero-heading" className="relative w-full">
      {/* Full-width background image */}
      <div className="relative min-h-[420px] w-full sm:min-h-[460px] lg:min-h-[500px]">
        {facility_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={facility_image_url}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <div className="bg-muted absolute inset-0">
            <Bug
              className="text-muted-foreground/20 absolute bottom-1/3 left-1/4 size-24"
              aria-hidden="true"
            />
          </div>
        )}

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />

        {/* Text overlay — bottom left */}
        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 lg:p-12">
          <h1
            id="hero-heading"
            className="max-w-lg text-3xl leading-tight font-bold text-white sm:text-4xl lg:text-5xl"
          >
            A World of <span className="text-primary-foreground/90 italic">Natural Wonder.</span>
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/80 sm:text-base">
            {description ??
              "Explore the delicate beauty of over 45 tropical species in our climate-controlled sanctuary."}
          </p>
        </div>
      </div>

      {/* Live Stats — overlaps bottom of hero, right-aligned on desktop */}
      <div className="mx-auto flex max-w-7xl justify-end px-4 sm:px-6 lg:px-8">
        <div className="-mt-12 w-full sm:-mt-16 lg:w-auto">
          <LiveStats totalButterflies={totalButterflies} totalSpecies={totalSpecies} />
        </div>
      </div>
    </section>
  );
}
