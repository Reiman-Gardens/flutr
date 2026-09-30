/** Fixtures mirror the live service payload, which differs from its API reference. */

import {
  labelFromTags,
  normalizeKey,
  pickPrimary,
  tierUrl,
  toSpeciesImages,
} from "@/lib/wingspan/images";
import type { WingspanCatalog, WingspanImage, WingspanSpecies } from "@/lib/wingspan/images";

function makeImage(overrides: Partial<WingspanImage> = {}): WingspanImage {
  return {
    id: 1,
    xsmallUrl: "https://cdn.test/xsmall.jpg",
    smallUrl: "https://cdn.test/small.jpg",
    mediumUrl: "https://cdn.test/medium.jpg",
    largeUrl: "https://cdn.test/large.jpg",
    description: null,
    isFeatured: false,
    tags: [],
    ...overrides,
  };
}

function makeSpecies(overrides: Partial<WingspanSpecies> = {}): WingspanSpecies {
  return {
    id: 122,
    name: "Red Lacewing",
    scientificName: "Cethosia biblis",
    description: null,
    orderName: "Lepidoptera",
    family: "Nymphalidae",
    genus: "Cethosia",
    thumbnailUrl: null,
    images: [],
    ...overrides,
  };
}

const WINGS_OPEN = { tagId: 165, tagName: "Wings Open", tagCategory: "Wings View" };
const FEMALE = { tagId: 10, tagName: "Female", tagCategory: "Sex" };
const ADULT = { tagId: 3, tagName: "Adult", tagCategory: "Life Stage" };
const HORIZONTAL = { tagId: 93, tagName: "Horizontal", tagCategory: "Layout" };
const UNKNOWN = { tagId: 99, tagName: "Unknown", tagCategory: "Sex" };

describe("normalizeKey", () => {
  it("absorbs case and whitespace drift between the two catalogs", () => {
    expect(normalizeKey("  Danaus   Plexippus ")).toBe("danaus plexippus");
    expect(normalizeKey("Danaus plexippus")).toBe(normalizeKey("DANAUS PLEXIPPUS"));
  });
});

describe("pickPrimary", () => {
  it("returns null when the species has no images", () => {
    expect(pickPrimary(makeSpecies({ images: [] }))).toBeNull();
  });

  it("prefers the image thumbnailUrl points at", () => {
    const chosen = makeImage({ id: 2, mediumUrl: "https://cdn.test/chosen_medium.jpg" });
    const other = makeImage({ id: 3, isFeatured: true });
    const species = makeSpecies({
      thumbnailUrl: "https://cdn.test/chosen_medium.jpg",
      images: [other, chosen],
    });

    expect(pickPrimary(species)).toBe(chosen);
  });

  it("matches thumbnailUrl against any size tier, not just medium", () => {
    const chosen = makeImage({ id: 4, largeUrl: "https://cdn.test/only_large.jpg" });
    const species = makeSpecies({
      thumbnailUrl: "https://cdn.test/only_large.jpg",
      images: [makeImage({ id: 5 }), chosen],
    });

    expect(pickPrimary(species)).toBe(chosen);
  });

  it("falls back to a featured image when thumbnailUrl is absent", () => {
    const featured = makeImage({ id: 6, isFeatured: true });
    const species = makeSpecies({ images: [makeImage({ id: 7 }), featured] });

    expect(pickPrimary(species)).toBe(featured);
  });

  it("falls back to a wings-open image, matching the service's Title Case tags", () => {
    const wingsOpen = makeImage({ id: 8, tags: [WINGS_OPEN] });
    const species = makeSpecies({ images: [makeImage({ id: 9 }), wingsOpen] });

    expect(pickPrimary(species)).toBe(wingsOpen);
  });

  it("also matches the kebab-case tag format the docs describe", () => {
    const wingsOpen = makeImage({
      id: 10,
      tags: [{ tagId: 1, tagName: "wings-open", tagCategory: "position" }],
    });
    const species = makeSpecies({ images: [makeImage({ id: 11 }), wingsOpen] });

    expect(pickPrimary(species)).toBe(wingsOpen);
  });

  it("falls back to the first image when no signal is available", () => {
    const first = makeImage({ id: 12 });
    const species = makeSpecies({ images: [first, makeImage({ id: 13 })] });

    expect(pickPrimary(species)).toBe(first);
  });

  it("ignores a thumbnailUrl that matches nothing", () => {
    const featured = makeImage({ id: 14, isFeatured: true });
    const species = makeSpecies({
      thumbnailUrl: "https://cdn.test/stale.jpg",
      images: [makeImage({ id: 15 }), featured],
    });

    expect(pickPrimary(species)).toBe(featured);
  });
});

describe("tierUrl", () => {
  it("picks the tier that matches the render size", () => {
    const image = makeImage();
    expect(tierUrl(image, "thumb")).toBe("https://cdn.test/xsmall.jpg");
    expect(tierUrl(image, "card")).toBe("https://cdn.test/small.jpg");
    expect(tierUrl(image, "full")).toBe("https://cdn.test/large.jpg");
  });

  it("degrades to a larger tier when a size was not generated", () => {
    const small = makeImage({ xsmallUrl: null, largeUrl: null });
    expect(tierUrl(small, "thumb")).toBe("https://cdn.test/small.jpg");
    expect(tierUrl(small, "full")).toBe("https://cdn.test/medium.jpg");
  });

  it("bottoms out at mediumUrl, the only size the service always generates", () => {
    const bare = makeImage({ xsmallUrl: null, smallUrl: null, largeUrl: null });
    expect(tierUrl(bare, "thumb")).toBe("https://cdn.test/medium.jpg");
    expect(tierUrl(bare, "card")).toBe("https://cdn.test/medium.jpg");
    expect(tierUrl(bare, "full")).toBe("https://cdn.test/medium.jpg");
  });
});

describe("labelFromTags", () => {
  it("captions from the tags that describe the butterfly, in a stable order", () => {
    expect(labelFromTags([FEMALE, ADULT, WINGS_OPEN], 0)).toBe("Wings Open, Female, Adult");
  });

  it("drops Layout tags, which describe the photo rather than the animal", () => {
    expect(labelFromTags([HORIZONTAL, WINGS_OPEN], 0)).toBe("Wings Open");
  });

  it("drops the Unknown placeholder", () => {
    expect(labelFromTags([UNKNOWN, WINGS_OPEN], 0)).toBe("Wings Open");
  });

  it("normalizes kebab-case tags into readable text", () => {
    expect(labelFromTags([{ tagId: 1, tagName: "wings-open", tagCategory: "Wings View" }], 0)).toBe(
      "Wings Open",
    );
  });

  it("falls back to the position when nothing usable remains", () => {
    expect(labelFromTags([], 0)).toBe("Photo 1");
    expect(labelFromTags([HORIZONTAL, UNKNOWN], 3)).toBe("Photo 4");
  });
});

describe("toSpeciesImages", () => {
  function catalogWith(species: WingspanSpecies): WingspanCatalog {
    return new Map([
      [normalizeKey(species.scientificName), species],
      [normalizeKey(species.name), species],
    ]);
  }

  it("returns an empty list for an unmatched species", () => {
    const catalog = catalogWith(makeSpecies({ images: [makeImage()] }));
    expect(toSpeciesImages(catalog, "Nonexistent species")).toEqual([]);
  });

  it("returns an empty list when the species has no images", () => {
    const catalog = catalogWith(makeSpecies({ images: [] }));
    expect(toSpeciesImages(catalog, "Cethosia biblis")).toEqual([]);
  });

  it("matches on scientific name regardless of case and spacing", () => {
    const catalog = catalogWith(makeSpecies({ images: [makeImage()] }));
    expect(toSpeciesImages(catalog, "  cethosia   BIBLIS ")).toHaveLength(1);
  });

  it("falls back to the common name when the scientific name misses", () => {
    const catalog = catalogWith(makeSpecies({ images: [makeImage()] }));
    expect(toSpeciesImages(catalog, "Wrong name", "Red Lacewing")).toHaveLength(1);
  });

  it("puts the primary image first without dropping the others", () => {
    const species = makeSpecies({
      thumbnailUrl: "https://cdn.test/pick_medium.jpg",
      images: [
        makeImage({ id: 10 }),
        makeImage({ id: 11, mediumUrl: "https://cdn.test/pick_medium.jpg" }),
        makeImage({ id: 12 }),
      ],
    });

    const images = toSpeciesImages(catalogWith(species), "Cethosia biblis");
    expect(images.map((img) => img.id)).toEqual([11, 10, 12]);
  });

  it("promotes a wings-closed image to second so it pairs with the primary", () => {
    const species = makeSpecies({
      thumbnailUrl: "https://cdn.test/pick_medium.jpg",
      images: [
        makeImage({ id: 30 }),
        makeImage({ id: 31, mediumUrl: "https://cdn.test/pick_medium.jpg" }),
        makeImage({
          id: 32,
          tags: [{ tagId: 2, tagName: "Wings Closed", tagCategory: "Wings View" }],
        }),
      ],
    });

    const images = toSpeciesImages(catalogWith(species), "Cethosia biblis");
    expect(images.map((img) => img.id)).toEqual([31, 32, 30]);
  });

  it("leaves the order alone when no image is tagged wings-closed", () => {
    const species = makeSpecies({
      thumbnailUrl: "https://cdn.test/pick_medium.jpg",
      images: [
        makeImage({ id: 40 }),
        makeImage({ id: 41, mediumUrl: "https://cdn.test/pick_medium.jpg" }),
        makeImage({ id: 42 }),
      ],
    });

    const images = toSpeciesImages(catalogWith(species), "Cethosia biblis");
    expect(images.map((img) => img.id)).toEqual([41, 40, 42]);
  });

  it("resolves every tier and a caption per image", () => {
    const species = makeSpecies({
      images: [
        makeImage({
          id: 20,
          tags: [{ tagId: 2, tagName: "Wings Closed", tagCategory: "Wings View" }],
        }),
      ],
    });

    expect(toSpeciesImages(catalogWith(species), "Cethosia biblis")[0]).toEqual({
      id: 20,
      label: "Wings Closed",
      thumb: "https://cdn.test/xsmall.jpg",
      card: "https://cdn.test/small.jpg",
      full: "https://cdn.test/large.jpg",
    });
  });
});
