jest.mock("@/lib/queries/home", () => ({
  getFeaturedSpeciesList: jest.fn(),
}));

jest.mock("@/lib/wingspan/client", () => ({
  attachImages: jest.fn(),
}));

import { getFeaturedSpeciesList } from "@/lib/queries/home";
import { attachImages } from "@/lib/wingspan/client";
import { seededDayIndex } from "@/lib/utils";
import type { SpeciesImage } from "@/lib/wingspan/images";

const mockGetFeaturedSpeciesList = getFeaturedSpeciesList as jest.Mock;
const mockAttachImages = attachImages as jest.Mock;

const IMAGE: SpeciesImage = {
  id: 1,
  label: "Wings open",
  thumb: "https://cdn.test/xsmall.jpg",
  card: "https://cdn.test/small.jpg",
  full: "https://cdn.test/large.jpg",
};

function candidate(scientificName: string, images: SpeciesImage[]) {
  return {
    scientific_name: scientificName,
    common_name: scientificName,
    family: "Nymphalidae",
    range: ["South America"],
    lifespan_days: 14,
    host_plant: null,
    in_flight_count: 3,
    images,
  };
}

/** The service is React-cached, so each test needs a fresh module registry. */
async function loadService() {
  let mod!: typeof import("@/lib/services/butterfly-of-the-day");
  await jest.isolateModulesAsync(async () => {
    mod = await import("@/lib/services/butterfly-of-the-day");
  });
  return mod;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetFeaturedSpeciesList.mockResolvedValue([]);
});

describe("getButterflyOfTheDay", () => {
  it("returns null when nothing is in flight", async () => {
    mockAttachImages.mockResolvedValue([]);
    const { getButterflyOfTheDay: fn } = await loadService();

    await expect(fn(305)).resolves.toBeNull();
  });

  it("picks deterministically from the candidates that have images", async () => {
    const withImages = [
      candidate("Belenois creona", [IMAGE]),
      candidate("Papilio maackii", [IMAGE]),
    ];
    mockAttachImages.mockResolvedValue([...withImages, candidate("Pteronymia agalla", [])]);
    const { getButterflyOfTheDay: fn } = await loadService();

    await expect(fn(304)).resolves.toEqual(withImages[seededDayIndex(withImages.length, 304)]);
  });

  it("never picks an imageless species while an illustrated one exists", async () => {
    mockAttachImages.mockResolvedValue([
      candidate("No photo A", []),
      candidate("Has photo", [IMAGE]),
      candidate("No photo B", []),
    ]);
    const { getButterflyOfTheDay: fn } = await loadService();

    const picked = await fn(7);
    expect(picked?.scientific_name).toBe("Has photo");
  });

  it("still returns a species when Wingspan has no images at all", async () => {
    const candidates = [candidate("Danaus plexippus", []), candidate("Morpho peleides", [])];
    mockAttachImages.mockResolvedValue(candidates);
    const { getButterflyOfTheDay: fn } = await loadService();

    await expect(fn(42)).resolves.toEqual(candidates[seededDayIndex(candidates.length, 42)]);
  });

  it("loads the candidate list for the requested institution", async () => {
    mockAttachImages.mockResolvedValue([]);
    const { getButterflyOfTheDay: fn } = await loadService();

    await fn(301);

    expect(mockGetFeaturedSpeciesList).toHaveBeenCalledWith(301);
  });
});
