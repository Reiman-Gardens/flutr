import Image from "next/image";
import { Bug } from "lucide-react";

import { cn } from "@/lib/utils";
import type { SpeciesImage } from "@/lib/wingspan/images";

/**
 * How many thumbnails each row layout can carry, as per-index reveal classes.
 * Written as literal classes so Tailwind's scanner sees them.
 *
 * Room does not grow with the viewport: the row flips horizontal at `md` and
 * the shell's `w-56` sidebar lands at `lg`, so capacity drops at both. Each
 * ladder therefore holds the minimum capacity from its breakpoint upward, and
 * every reveal is permanent — an image must never disappear as you widen.
 *
 * Counts stay at one on the narrowest screens, where the steppers themselves
 * can wrap.
 */
const PROFILES = {
  /** Two steppers — the roomiest layout. */
  emergence: {
    reveal: ["", "hidden sm:block", "hidden md:block", "hidden xl:block"],
    box: "size-20",
    icon: "size-7",
    px: 160,
  },
  /** Three steppers; the second image waits until the row is clearly wide enough. */
  other: {
    reveal: ["", "hidden xl:block"],
    box: "size-20",
    icon: "size-7",
    px: 160,
  },
  /** Seven-column edit grid, whose species cell is ~236px at its widest. */
  compact: {
    reveal: ["", "hidden lg:block"],
    box: "size-12",
    icon: "size-4",
    px: 96,
  },
} as const;

interface SpeciesThumbnailStripProps {
  images: SpeciesImage[];
  profile: keyof typeof PROFILES;
}

/**
 * Thumbnails for one species row, primary first.
 *
 * Images are decorative here — every row prints the species name beside them —
 * so they carry empty alt text rather than repeating a label per image.
 */
export function SpeciesThumbnailStrip({ images, profile }: SpeciesThumbnailStripProps) {
  const { reveal, box, icon, px } = PROFILES[profile];
  const shown = images.slice(0, reveal.length);

  if (shown.length === 0) {
    return (
      <div className={cn("bg-muted relative shrink-0 overflow-hidden rounded", box)}>
        <Bug className={cn("text-muted-foreground absolute inset-0 m-auto", icon)} />
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      {shown.map((image, index) => (
        <div
          key={image.id}
          className={cn("bg-muted relative shrink-0 overflow-hidden rounded", box, reveal[index])}
        >
          <Image
            src={image.thumb}
            alt=""
            width={px}
            height={px}
            unoptimized
            className="size-full object-cover"
          />
        </div>
      ))}
    </div>
  );
}
