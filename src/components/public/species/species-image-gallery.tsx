"use client";

import Image from "next/image";
import { Images } from "lucide-react";

import { SpeciesImageLightbox } from "@/components/public/species/species-image-lightbox";
import type { SpeciesImage } from "@/lib/wingspan/images";

interface SpeciesImageGalleryProps {
  commonName: string;
  images: SpeciesImage[];
}

export function SpeciesImageGallery({ commonName, images }: SpeciesImageGalleryProps) {
  if (images.length === 0) return null;

  return (
    <section aria-labelledby="gallery-heading">
      <h2 id="gallery-heading" className="text-lg font-bold">
        <Images className="mr-1.5 mb-0.5 inline-block size-5" aria-hidden="true" />
        Gallery
      </h2>

      <SpeciesImageLightbox commonName={commonName} images={images}>
        {(openAt) => (
          <div className="mt-3 grid grid-cols-2 gap-4 lg:grid-cols-2">
            {images.map((img, index) => (
              <figure key={img.id} className="overflow-hidden rounded-xl">
                <button
                  type="button"
                  onClick={() => openAt(index)}
                  className="group focus-visible:ring-ring relative aspect-square w-full cursor-pointer overflow-hidden focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  aria-label={`View ${commonName} — ${img.label} fullscreen`}
                >
                  <Image
                    src={img.card}
                    alt={`${commonName} — ${img.label}`}
                    fill
                    sizes="(min-width: 1024px) 50vw, 50vw"
                    className="object-cover transition-transform motion-safe:group-hover:scale-105"
                  />
                </button>
                <figcaption className="bg-muted px-2 py-1.5 text-center text-xs font-medium">
                  {img.label}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </SpeciesImageLightbox>
    </section>
  );
}
