import {
  buildMappedRegions,
  findUnmappedRegions,
  getHeatColor,
  getHeatRadius,
  getRegionKeyForLabel,
  getRegionLabelForRange,
  speciesBelongsToRegion,
} from "@/components/shared/stats/region-heat-map.utils";

describe("region heat map utilities", () => {
  it("merges south and central america labels into one plotted region", () => {
    const mapped = buildMappedRegions([
      { name: "Central/South America", count: 4 },
      { name: "South America", count: 2 },
      { name: "Asia", count: 3 },
    ]);

    expect(mapped).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Central and South America",
          count: 6,
          sourceLabels: ["Central/South America", "South America"],
        }),
        expect.objectContaining({
          label: "Asia",
          count: 3,
        }),
      ]),
    );
  });

  it("reports unmapped labels separately", () => {
    expect(findUnmappedRegions([{ name: "Antarctica", count: 1 }])).toEqual([
      { name: "Antarctica", count: 1 },
    ]);
  });

  it("scales heat styling from low to high intensity", () => {
    expect(getHeatColor(1, 10)).toBe("#bad9ba");
    expect(getHeatColor(10, 10)).toBe("#4a7f63");
    expect(getHeatRadius(10, 10)).toBeGreaterThan(getHeatRadius(1, 10));
  });

  it("resolves the canonical region label as well as its aliases", () => {
    expect(getRegionKeyForLabel("Central and South America")).toBe("central-south-america");
    expect(getRegionKeyForLabel("South America")).toBe("central-south-america");
    expect(getRegionKeyForLabel("Central America")).toBe("central-south-america");
    expect(getRegionKeyForLabel("North America")).toBe("north-america");
    expect(getRegionKeyForLabel("unknown")).toBeNull();
  });

  it("maps species ranges back to the plotted region label", () => {
    expect(getRegionLabelForRange(["South America"])).toBe("Central and South America");
    expect(
      speciesBelongsToRegion(
        {
          name: "Atlas Moth",
          quantity: 4,
          scientific_name: "Attacus atlas",
          family: "Saturniidae",
          range: ["Asia"],
          img_wings_open: null,
        },
        "Asia",
      ),
    ).toBe(true);
  });
});
