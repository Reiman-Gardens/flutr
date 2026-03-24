"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface LightboxImage {
  src: string;
  label: string;
}

interface SpeciesImageLightboxProps {
  commonName: string;
  images: LightboxImage[];
  children: (openAt: (index: number) => void) => React.ReactNode;
}

export function SpeciesImageLightbox({ commonName, images, children }: SpeciesImageLightboxProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const openAt = useCallback((index: number) => {
    setActiveIndex(index);
    setOpen(true);
  }, []);

  const prev = useCallback(() => {
    setActiveIndex((i) => (i > 0 ? i - 1 : images.length - 1));
  }, [images.length]);

  const next = useCallback(() => {
    setActiveIndex((i) => (i < images.length - 1 ? i + 1 : 0));
  }, [images.length]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      }
    },
    [prev, next],
  );

  const current = images[activeIndex];

  return (
    <>
      {children(openAt)}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="border-none bg-transparent p-0 shadow-none sm:max-w-4xl"
          onKeyDown={handleKeyDown}
        >
          <DialogTitle className="sr-only">
            {commonName} — {current?.label}
          </DialogTitle>

          {/* Close button */}
          <button
            onClick={() => setOpen(false)}
            className="absolute top-3 right-3 z-10 flex size-9 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:outline-none"
            aria-label="Close fullscreen view"
          >
            <X className="size-5" />
          </button>

          {/* Image */}
          {current && (
            <div className="relative aspect-4/3 w-full overflow-hidden rounded-lg sm:aspect-3/2">
              <Image
                src={current.src}
                alt={`${commonName} — ${current.label}`}
                fill
                sizes="(min-width: 768px) 80vw, 100vw"
                className="object-contain"
                priority
              />
            </div>
          )}

          {/* Navigation + label bar */}
          {images.length > 1 && (
            <div className="flex items-center justify-between px-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={prev}
                className="text-white hover:bg-white/20"
                aria-label="Previous image"
              >
                <ChevronLeft className="size-5" aria-hidden="true" />
              </Button>

              <p aria-live="polite" className="text-sm font-medium text-white">
                {current?.label} — {activeIndex + 1} of {images.length}
              </p>

              <Button
                variant="ghost"
                size="sm"
                onClick={next}
                className="text-white hover:bg-white/20"
                aria-label="Next image"
              >
                <ChevronRight className="size-5" aria-hidden="true" />
              </Button>
            </div>
          )}

          {/* Single image label (no nav needed) */}
          {images.length === 1 && (
            <p className="px-2 text-center text-sm font-medium text-white">{current?.label}</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
