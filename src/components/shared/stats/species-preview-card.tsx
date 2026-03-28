"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { Bug, ChevronRight, X } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import type { SpeciesBreakdownItem } from "@/lib/queries/stats";

interface SpeciesPreviewCardProps {
  species: SpeciesBreakdownItem;
  slug: string;
  onClose: () => void;
}

export function SpeciesPreviewCard({ species, slug, onClose }: SpeciesPreviewCardProps) {
  const region = species.range.length > 0 ? species.range[0] : null;
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${species.name} preview`}
      className="animate-in fade-in slide-in-from-bottom-4 fixed inset-x-0 bottom-16 z-50 p-4 sm:absolute sm:inset-x-auto sm:bottom-4 sm:left-1/2 sm:w-full sm:max-w-sm sm:-translate-x-1/2 sm:p-0 md:bottom-0"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          onClose();
        }
      }}
    >
      <Card className="gap-0 overflow-hidden py-0 shadow-xl">
        {/* Close button */}
        <Button
          ref={closeButtonRef}
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 z-10 size-7 rounded-full bg-black/40 text-white hover:bg-black/60"
          onClick={onClose}
          aria-label="Close preview"
        >
          <X className="size-3.5" />
        </Button>

        {/* Image */}
        <div className="relative aspect-4/3 overflow-hidden">
          {species.img_wings_open ? (
            <Image
              src={species.img_wings_open}
              alt={`${species.name} (${species.scientific_name})`}
              fill
              sizes="(min-width: 640px) 384px, 100vw"
              className="object-cover"
            />
          ) : (
            <div className="bg-muted flex size-full items-center justify-center">
              <Bug className="text-muted-foreground/30 size-10" aria-hidden="true" />
            </div>
          )}

          {/* Chips */}
          <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
            {region && (
              <span className="bg-background text-foreground rounded-full px-2.5 py-0.5 text-xs font-medium shadow-sm">
                <span className="sr-only">Region: </span>
                {region}
              </span>
            )}
            <span className="bg-background text-foreground rounded-full px-2.5 py-0.5 text-xs font-medium shadow-sm">
              {species.family}
            </span>
            <span className="bg-background text-foreground rounded-full px-2.5 py-0.5 text-xs font-medium shadow-sm">
              <span className="sr-only">Number of butterflies in flight: </span>
              {species.quantity} Flying Today
            </span>
          </div>
        </div>

        {/* Info */}
        <CardContent className="py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold">{species.name}</h3>
              <p className="text-muted-foreground truncate text-xs italic">
                {species.scientific_name}
              </p>
            </div>
            <Link
              href={`/${slug}/${encodeURIComponent(species.scientific_name)}`}
              className="text-primary hover:text-primary/80 flex shrink-0 items-center gap-0.5 text-xs font-medium"
              aria-label={`More info about ${species.name}`}
            >
              More Info
              <ChevronRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
