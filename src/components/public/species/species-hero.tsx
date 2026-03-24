import Image from "next/image";
import { Bug } from "lucide-react";

import { BackButton } from "@/components/shared/back-button";

interface SpeciesHeroProps {
  slug: string;
  commonName: string;
  scientificName: string;
  imgWingsOpen: string | null;
}

export function SpeciesHero({ slug, commonName, scientificName, imgWingsOpen }: SpeciesHeroProps) {
  return (
    <section aria-labelledby="species-heading" className="relative w-full">
      <div className="relative min-h-[320px] w-full overflow-hidden sm:min-h-[380px] lg:min-h-[420px]">
        {imgWingsOpen ? (
          <Image
            src={imgWingsOpen}
            alt={`${commonName} (${scientificName})`}
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
        ) : (
          <div className="bg-muted absolute inset-0 flex items-center justify-center">
            <Bug className="text-muted-foreground/30 size-16" aria-hidden="true" />
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/50 to-black/30" />

        {/* Back button — floating top-left */}
        <div className="absolute top-4 left-4 z-10 sm:top-6 sm:left-6">
          <BackButton fallbackHref={`/${slug}/gallery`} />
        </div>

        {/* Text overlay */}
        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
          <h1
            id="species-heading"
            className="text-3xl leading-tight font-bold text-white sm:text-4xl lg:text-5xl"
          >
            {commonName}
          </h1>
          <p className="mt-1 text-lg text-white/80 italic">{scientificName}</p>
        </div>
      </div>
    </section>
  );
}
