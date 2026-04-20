import Image from "next/image";
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
          <Image
            src={facility_image_url}
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
        ) : (
          <div className="absolute inset-0 overflow-hidden bg-gradient-to-br from-emerald-950 via-teal-900 to-green-950">
            <Bug
              className="absolute top-6 left-8 size-20 rotate-12 text-white/10"
              aria-hidden="true"
            />
            <Bug
              className="absolute top-1/3 right-16 size-32 -rotate-6 text-white/[0.07]"
              aria-hidden="true"
            />
            <Bug
              className="absolute bottom-10 left-1/3 size-16 rotate-45 text-white/10"
              aria-hidden="true"
            />
            <Bug
              className="absolute right-8 -bottom-2 size-28 -rotate-12 text-white/[0.06]"
              aria-hidden="true"
            />
          </div>
        )}

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/50 to-black/30" />

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
        <div className="w-full sm:-mt-16 lg:w-auto">
          <LiveStats totalButterflies={totalButterflies} totalSpecies={totalSpecies} />
        </div>
      </div>
    </section>
  );
}
