/** Types and pure helpers for Wingspan butterfly imagery. No React, no I/O. */

export interface WingspanTag {
  tagId: number;
  tagName: string;
  tagCategory: string;
}

export interface WingspanImage {
  id: number;
  /** 300px. Lowercase "s" — the API reference says `xSmallUrl`, the service sends `xsmallUrl`. */
  xsmallUrl: string | null;
  /** 800px. */
  smallUrl: string | null;
  /** 1024px. The only size the service always generates, so tier fallbacks end here. */
  mediumUrl: string;
  /** 2048px. Present on a small minority of uploads. */
  largeUrl: string | null;
  description: string | null;
  isFeatured: boolean;
  tags: WingspanTag[];
}

export interface WingspanSpecies {
  id: number;
  /** Common name. */
  name: string;
  scientificName: string;
  description: string | null;
  orderName: string | null;
  family: string | null;
  genus: string | null;
  /** Curator's primary image, as a bare URL matching one of the URLs in `images`. */
  thumbnailUrl: string | null;
  images: WingspanImage[];
}

export type WingspanCatalog = Map<string, WingspanSpecies>;

/**
 * - `thumb` — grid cards and 56–160px avatars; rendered `unoptimized`, the 300px
 *   tier is already the right size and each variant is a billed transformation
 * - `card` — gallery tiles and mid-size feature panels
 * - `full` — hero banners and the lightbox
 */
export interface SpeciesImage {
  id: number;
  label: string;
  thumb: string;
  card: string;
  full: string;
}

export type ImageTier = "thumb" | "card" | "full";

export type WithImages<T> = T & { images: SpeciesImage[] };

export function normalizeKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Tag text varies between kebab-case and Title Case; compare normalized. */
function normalizeTag(value: string): string {
  return value.trim().toLowerCase().replace(/[-_]+/g, " ").replace(/\s+/g, " ");
}

function hasTag(image: WingspanImage, tagName: string): boolean {
  const wanted = normalizeTag(tagName);
  return image.tags.some((tag) => normalizeTag(tag.tagName) === wanted);
}

function imageServesUrl(image: WingspanImage, url: string): boolean {
  return (
    image.xsmallUrl === url ||
    image.smallUrl === url ||
    image.mediumUrl === url ||
    image.largeUrl === url
  );
}

/** The image that stands in for the species wherever only one fits. */
export function pickPrimary(species: WingspanSpecies): WingspanImage | null {
  const { images, thumbnailUrl } = species;
  if (images.length === 0) return null;

  return (
    (thumbnailUrl ? images.find((img) => imageServesUrl(img, thumbnailUrl)) : undefined) ??
    images.find((img) => img.isFeatured) ??
    images.find((img) => hasTag(img, "wings open")) ??
    images[0]
  );
}

export function tierUrl(image: WingspanImage, tier: ImageTier): string {
  if (tier === "thumb") {
    return image.xsmallUrl ?? image.smallUrl ?? image.mediumUrl;
  }
  if (tier === "card") {
    return image.smallUrl ?? image.mediumUrl;
  }
  return image.largeUrl ?? image.mediumUrl;
}

/** Tag categories that describe the butterfly, in caption order. Others are noise. */
const CAPTION_CATEGORIES = ["Wings View", "Sex", "Life Stage"];

const UNKNOWN_TAG = "unknown";

function titleCase(value: string): string {
  return value.replace(/\b\w/g, (ch) => ch.toUpperCase());
}

/** Caption for an image, used as both `alt` text and the visible figcaption. */
export function labelFromTags(tags: WingspanTag[], index: number): string {
  const described = tags
    .filter(
      (tag) =>
        CAPTION_CATEGORIES.includes(tag.tagCategory) && normalizeTag(tag.tagName) !== UNKNOWN_TAG,
    )
    .sort(
      (a, b) =>
        CAPTION_CATEGORIES.indexOf(a.tagCategory) - CAPTION_CATEGORIES.indexOf(b.tagCategory),
    )
    .map((tag) => titleCase(normalizeTag(tag.tagName)));

  if (described.length === 0) return `Photo ${index + 1}`;
  return described.join(", ");
}

export function toSpeciesImage(image: WingspanImage, index: number): SpeciesImage {
  return {
    id: image.id,
    label: labelFromTags(image.tags, index),
    thumb: tierUrl(image, "thumb"),
    card: tierUrl(image, "card"),
    full: tierUrl(image, "full"),
  };
}

/**
 * Every image for a species, primary first and a wings-closed shot second when
 * one exists. `[]` when unmatched, which renders the placeholder.
 *
 * Open/closed is the pairing a visitor wants, and most callers show only the
 * first two.
 *
 * Common name is only a fallback: Flutr's `common_name` is not unique.
 */
export function toSpeciesImages(
  catalog: WingspanCatalog,
  scientificName: string,
  commonName?: string,
): SpeciesImage[] {
  const species =
    catalog.get(normalizeKey(scientificName)) ??
    (commonName ? catalog.get(normalizeKey(commonName)) : undefined);

  if (!species || species.images.length === 0) return [];

  const primary = pickPrimary(species);
  if (!primary) return species.images.map(toSpeciesImage);

  const rest = species.images.filter((img) => img.id !== primary.id);
  const closedIndex = rest.findIndex((img) => hasTag(img, "wings closed"));
  if (closedIndex > 0) {
    rest.unshift(...rest.splice(closedIndex, 1));
  }

  return [primary, ...rest].map(toSpeciesImage);
}
