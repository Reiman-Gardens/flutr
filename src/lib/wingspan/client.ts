/**
 * Server-only client for the Wingspan image microservice.
 *
 * One `GET /species/all-with-images` per TTL window builds an in-memory catalog
 * keyed by name; every lookup after that is a Map hit.
 *
 * Nothing here throws — a Wingspan outage yields an empty catalog, which
 * renders as the existing placeholder.
 */

import { normalizeKey, toSpeciesImages } from "@/lib/wingspan/images";
import type { SpeciesImage, WingspanCatalog, WingspanSpecies } from "@/lib/wingspan/images";

const BASE_URL = process.env.WINGSPAN_API_URL;
const API_KEY = process.env.WINGSPAN_API_KEY;

const REQUEST_TIMEOUT_MS = 8_000;
const SUCCESS_TTL_MS = 60 * 60 * 1000;
const FAILURE_TTL_MS = 60 * 1000;

// ponytail: per-process cache. Each server instance warms its own copy; move to
// Redis if we scale past a couple of them.
let cached: { catalog: WingspanCatalog; expiresAt: number } | null = null;

/** Shared so concurrent requests during a cold window make one upstream call. */
let inFlight: Promise<WingspanCatalog> | null = null;

function indexSpecies(catalog: WingspanCatalog, species: WingspanSpecies): void {
  if (species.name) catalog.set(normalizeKey(species.name), species);
  // Written last so it wins any collision: scientific name is unique, common is not.
  if (species.scientificName) catalog.set(normalizeKey(species.scientificName), species);
}

function pickString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.length > 0) return value;
  }
  return null;
}

/** Keep only the fields Flutr renders; the rest would sit in memory for an hour. */
function trimSpecies(raw: Record<string, unknown>): WingspanSpecies | null {
  const id = raw.id;
  const scientificName = raw.scientificName;
  if (typeof id !== "number" || typeof scientificName !== "string") return null;

  const rawImages = Array.isArray(raw.images) ? raw.images : [];

  return {
    id,
    name: typeof raw.name === "string" ? raw.name : "",
    scientificName,
    description: typeof raw.description === "string" ? raw.description : null,
    orderName: typeof raw.orderName === "string" ? raw.orderName : null,
    family: typeof raw.family === "string" ? raw.family : null,
    genus: typeof raw.genus === "string" ? raw.genus : null,
    thumbnailUrl: typeof raw.thumbnailUrl === "string" ? raw.thumbnailUrl : null,
    images: rawImages.flatMap((image: Record<string, unknown>) => {
      // Without mediumUrl there is no tier to fall back to.
      if (typeof image?.id !== "number" || typeof image?.mediumUrl !== "string") return [];
      return [
        {
          id: image.id,
          // Accept both spellings so an upstream correction does not silently
          // drop the whole thumbnail tier.
          xsmallUrl: pickString(image.xsmallUrl, image.xSmallUrl),
          smallUrl: pickString(image.smallUrl),
          mediumUrl: image.mediumUrl,
          largeUrl: pickString(image.largeUrl),
          description: typeof image.description === "string" ? image.description : null,
          isFeatured: image.isFeatured === true,
          tags: Array.isArray(image.tags)
            ? image.tags.flatMap((tag: Record<string, unknown>) =>
                typeof tag?.tagName === "string"
                  ? [
                      {
                        tagId: typeof tag.tagId === "number" ? tag.tagId : 0,
                        tagName: tag.tagName,
                        tagCategory: typeof tag.tagCategory === "string" ? tag.tagCategory : "",
                      },
                    ]
                  : [],
              )
            : [],
        },
      ];
    }),
  };
}

async function fetchCatalog(): Promise<WingspanCatalog> {
  const catalog: WingspanCatalog = new Map();

  if (!BASE_URL || !API_KEY) {
    // console, not logger: logger is dev-only, and this blanks every image.
    console.error("[wingspan] WINGSPAN_API_URL or WINGSPAN_API_KEY is not set");
    return catalog;
  }

  const response = await fetch(`${BASE_URL.replace(/\/$/, "")}/species/all-with-images`, {
    headers: { "X-API-Key": API_KEY },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    // Caching is owned by the TTL below.
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Wingspan responded ${response.status} ${response.statusText}`);
  }

  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) {
    throw new Error("Wingspan returned a non-array species payload");
  }

  for (const raw of payload) {
    const species = trimSpecies(raw as Record<string, unknown>);
    if (species) indexSpecies(catalog, species);
  }

  return catalog;
}

/** The species catalog, from cache when warm. Always resolves. */
export async function getWingspanCatalog(): Promise<WingspanCatalog> {
  if (cached && cached.expiresAt > Date.now()) return cached.catalog;
  if (inFlight) return inFlight;

  inFlight = fetchCatalog()
    .then((catalog) => {
      cached = { catalog, expiresAt: Date.now() + SUCCESS_TTL_MS };
      return catalog;
    })
    .catch((error: unknown) => {
      // console, not logger: an image outage must be visible in production.
      console.error("[wingspan] failed to load species catalog", error);
      const empty: WingspanCatalog = new Map();
      cached = { catalog: empty, expiresAt: Date.now() + FAILURE_TTL_MS };
      return empty;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

// Nullable: several queries reach the species table through a left join.
type NamedRow = { scientific_name: string | null; common_name?: string | null };
type NamedRowCamel = { scientificName: string | null; commonName?: string | null };

/** Attach imagery to query rows, fetching the catalog once for the whole batch. */
export async function attachImages<T extends NamedRow>(
  rows: T[],
): Promise<(T & { images: SpeciesImage[] })[]> {
  const catalog = await getWingspanCatalog();
  return rows.map((row) => ({
    ...row,
    images: row.scientific_name
      ? toSpeciesImages(catalog, row.scientific_name, row.common_name ?? undefined)
      : [],
  }));
}

/** `attachImages` for the camelCase rows the tenant APIs return. */
export async function attachImagesCamel<T extends NamedRowCamel>(
  rows: T[],
): Promise<(T & { images: SpeciesImage[] })[]> {
  const catalog = await getWingspanCatalog();
  return rows.map((row) => ({
    ...row,
    images: row.scientificName
      ? toSpeciesImages(catalog, row.scientificName, row.commonName ?? undefined)
      : [],
  }));
}

export async function getSpeciesImages(
  scientificName: string,
  commonName?: string,
): Promise<SpeciesImage[]> {
  const catalog = await getWingspanCatalog();
  return toSpeciesImages(catalog, scientificName, commonName);
}
