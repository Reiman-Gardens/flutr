/**
 * Butterfly of the Day. Shared by the institution home and stats pages, which
 * must agree on the same species for the same day.
 */

import { cache } from "react";

import { getFeaturedSpeciesList } from "@/lib/queries/home";
import type { FeaturedSpeciesRow } from "@/lib/queries/home";
import { attachImages } from "@/lib/wingspan/client";
import type { SpeciesImage } from "@/lib/wingspan/images";
import { seededDayIndex } from "@/lib/utils";

export type ButterflyOfTheDay = FeaturedSpeciesRow & { images: SpeciesImage[] };

/**
 * Today's species for an institution, or null when nothing is in flight.
 *
 * Prefers species with a photo, since this renders as a large hero panel, but
 * falls back to the unfiltered list so an outage does not empty the feature.
 */
export const getButterflyOfTheDay = cache(
  async (institutionId: number): Promise<ButterflyOfTheDay | null> => {
    const candidates = await attachImages(await getFeaturedSpeciesList(institutionId));
    if (candidates.length === 0) return null;

    const withImages = candidates.filter((row) => row.images.length > 0);
    const pool = withImages.length > 0 ? withImages : candidates;

    return pool[seededDayIndex(pool.length, institutionId)] ?? null;
  },
);
