/** Payload below mirrors a real response, not the API reference. */

const ORIGINAL_ENV = process.env;

function speciesPayload() {
  return [
    {
      id: 122,
      name: "Red Lacewing",
      scientificName: "Cethosia biblis",
      description: "Butterfly found across South and Southeast Asia",
      orderName: "Lepidoptera",
      family: "Nymphalidae",
      genus: "Cethosia",
      thumbnailUrl: "https://cdn.test/medium.jpg",
      filename: "cethosia_biblis_9109.jpg",
      attributeDef: {},
      images: [
        {
          id: 276,
          xsmallUrl: "https://cdn.test/xsmall.jpg",
          smallUrl: "https://cdn.test/small.jpg",
          mediumUrl: "https://cdn.test/medium.jpg",
          largeUrl: null,
          originalUrl: "https://cdn.test/original.jpg",
          description: "None.",
          nathansNotes: "None.",
          fileSize: 2276333,
          lifecyclestage: "Adult",
          isFeatured: true,
          tags: [{ tagId: 165, tagName: "Wings Open", tagCategory: "Wings View" }],
          attributes: { Morph: "wet season" },
        },
      ],
    },
  ];
}

function mockFetchOnce(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  const fetchMock = jest.fn().mockResolvedValue({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    statusText: "OK",
    json: async () => body,
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

/** Fresh module registry per test so the module-level cache starts empty. */
async function loadClient() {
  let mod!: typeof import("@/lib/wingspan/client");
  await jest.isolateModulesAsync(async () => {
    mod = await import("@/lib/wingspan/client");
  });
  return mod;
}

beforeEach(() => {
  process.env = {
    ...ORIGINAL_ENV,
    WINGSPAN_API_URL: "http://wingspan.test",
    WINGSPAN_API_KEY: "test-key",
  };
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
  jest.restoreAllMocks();
});

describe("getWingspanCatalog", () => {
  it("sends the API key and indexes species by both names", async () => {
    const fetchMock = mockFetchOnce(speciesPayload());
    const { getWingspanCatalog } = await loadClient();

    const catalog = await getWingspanCatalog();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("http://wingspan.test/species/all-with-images");
    expect(options.headers).toEqual({ "X-API-Key": "test-key" });

    expect(catalog.get("cethosia biblis")).toBeDefined();
    expect(catalog.get("red lacewing")).toBeDefined();
  });

  it("keeps only the fields Flutr renders", async () => {
    mockFetchOnce(speciesPayload());
    const { getWingspanCatalog } = await loadClient();

    const species = (await getWingspanCatalog()).get("cethosia biblis");

    expect(species).not.toHaveProperty("filename");
    expect(species?.images[0]).not.toHaveProperty("fileSize");
    expect(species?.images[0]).not.toHaveProperty("nathansNotes");
    expect(species?.images[0]).not.toHaveProperty("attributes");
    expect(species?.images[0].largeUrl).toBeNull();
    expect(species?.images[0].isFeatured).toBe(true);
  });

  it("reads the service's lowercase xsmallUrl", async () => {
    mockFetchOnce(speciesPayload());
    const { getWingspanCatalog } = await loadClient();

    const species = (await getWingspanCatalog()).get("cethosia biblis");

    expect(species?.images[0].xsmallUrl).toBe("https://cdn.test/xsmall.jpg");
  });

  it("still accepts the documented xSmallUrl spelling", async () => {
    const payload = speciesPayload();
    const image = payload[0].images[0] as Record<string, unknown>;
    delete image.xsmallUrl;
    image.xSmallUrl = "https://cdn.test/doc-cased.jpg";
    mockFetchOnce(payload);
    const { getWingspanCatalog } = await loadClient();

    const species = (await getWingspanCatalog()).get("cethosia biblis");

    expect(species?.images[0].xsmallUrl).toBe("https://cdn.test/doc-cased.jpg");
  });

  it("keeps an image that has no originalUrl, since mediumUrl is the real floor", async () => {
    const payload = speciesPayload();
    const image = payload[0].images[0] as Record<string, unknown>;
    delete image.originalUrl;
    mockFetchOnce(payload);
    const { getWingspanCatalog } = await loadClient();

    const species = (await getWingspanCatalog()).get("cethosia biblis");

    expect(species?.images).toHaveLength(1);
  });

  it("drops an image with no mediumUrl, which has nothing renderable", async () => {
    const payload = speciesPayload();
    const image = payload[0].images[0] as Record<string, unknown>;
    delete image.mediumUrl;
    mockFetchOnce(payload);
    const { getWingspanCatalog } = await loadClient();

    const species = (await getWingspanCatalog()).get("cethosia biblis");

    expect(species?.images).toEqual([]);
  });

  it("retains thumbnailUrl so the primary image can be identified", async () => {
    mockFetchOnce(speciesPayload());
    const { getWingspanCatalog } = await loadClient();

    expect((await getWingspanCatalog()).get("cethosia biblis")?.thumbnailUrl).toBe(
      "https://cdn.test/medium.jpg",
    );
  });

  it("serves the cached catalog without calling upstream again", async () => {
    const fetchMock = mockFetchOnce(speciesPayload());
    const { getWingspanCatalog } = await loadClient();

    await getWingspanCatalog();
    await getWingspanCatalog();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("makes one upstream call for concurrent cold requests", async () => {
    const fetchMock = mockFetchOnce(speciesPayload());
    const { getWingspanCatalog } = await loadClient();

    await Promise.all([getWingspanCatalog(), getWingspanCatalog(), getWingspanCatalog()]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns an empty catalog on a non-200 instead of throwing", async () => {
    mockFetchOnce(null, { ok: false, status: 503 });
    const { getWingspanCatalog } = await loadClient();

    await expect(getWingspanCatalog()).resolves.toEqual(new Map());
  });

  it("returns an empty catalog when the request times out", async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new DOMException("timed out", "TimeoutError")) as unknown as typeof fetch;
    const { getWingspanCatalog } = await loadClient();

    await expect(getWingspanCatalog()).resolves.toEqual(new Map());
  });

  it("returns an empty catalog when the payload is not an array", async () => {
    mockFetchOnce({ error: "nope" });
    const { getWingspanCatalog } = await loadClient();

    await expect(getWingspanCatalog()).resolves.toEqual(new Map());
  });

  it("does not call upstream at all when the key is missing", async () => {
    delete process.env.WINGSPAN_API_KEY;
    const fetchMock = mockFetchOnce(speciesPayload());
    const { getWingspanCatalog } = await loadClient();

    await expect(getWingspanCatalog()).resolves.toEqual(new Map());
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("attachImages", () => {
  it("attaches images to rows and leaves unmatched rows with an empty list", async () => {
    mockFetchOnce(speciesPayload());
    const { attachImages } = await loadClient();

    const rows = await attachImages([
      { scientific_name: "Cethosia biblis", common_name: "Red Lacewing" },
      { scientific_name: "Danaus plexippus", common_name: "Monarch" },
    ]);

    expect(rows[0].images).toHaveLength(1);
    expect(rows[0].images[0].thumb).toBe("https://cdn.test/xsmall.jpg");
    expect(rows[0].images[0].label).toBe("Wings Open");
    expect(rows[1].images).toEqual([]);
  });

  it("fetches the catalog once for the whole batch", async () => {
    const fetchMock = mockFetchOnce(speciesPayload());
    const { attachImages } = await loadClient();

    await attachImages(Array.from({ length: 50 }, () => ({ scientific_name: "Cethosia biblis" })));

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
