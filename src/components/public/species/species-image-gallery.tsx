"use client";

import Image from "next/image";
import { Images } from "lucide-react";

import { SpeciesImageLightbox } from "@/components/public/species/species-image-lightbox";

interface SpeciesImageGalleryProps {
  commonName: string;
  imgWingsOpen: string | null;
  imgWingsClosed: string | null;
  extraImg1: string | null;
  extraImg2: string | null;
}

export function SpeciesImageGallery({
  commonName,
  imgWingsOpen,
  imgWingsClosed,
  extraImg1,
  extraImg2,
}: SpeciesImageGalleryProps) {
  const images: { src: string; label: string }[] = [];

  if (imgWingsOpen) images.push({ src: imgWingsOpen, label: "Wings Open" });
  if (imgWingsClosed) images.push({ src: imgWingsClosed, label: "Wings Closed" });
  if (extraImg1) images.push({ src: extraImg1, label: "Photo 3" });
  if (extraImg2) images.push({ src: extraImg2, label: "Photo 4" });

  if (images.length === 0) return null;

  return (
    <section aria-labelledby="gallery-heading">
      <h2 id="gallery-heading" className="text-lg font-bold">
        <Images className="mr-1.5 mb-0.5 inline-block size-5" aria-hidden="true" />
        Gallery
      </h2>

      <SpeciesImageLightbox commonName={commonName} images={images}>
        {(openAt) => (
          <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {images.map((img, index) => (
              <figure key={img.label} className="overflow-hidden rounded-xl">
                <button
                  type="button"
                  onClick={() => openAt(index)}
                  className="group focus-visible:ring-ring relative aspect-square w-full cursor-pointer overflow-hidden focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  aria-label={`View ${commonName} — ${img.label} fullscreen`}
                >
                  <Image
                    src={img.src}
                    alt={`${commonName} — ${img.label}`}
                    fill
                    sizes="(min-width: 1024px) 25vw, 50vw"
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
