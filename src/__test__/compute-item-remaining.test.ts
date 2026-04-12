import { computeItemRemaining, type ShipmentItemRow } from "@/components/tenant/shipments/types";

function makeItem(overrides: Partial<ShipmentItemRow> = {}): ShipmentItemRow {
  return {
    id: 1,
    butterflySpeciesId: 100,
    scientificName: "Danaus plexippus",
    commonName: "Monarch",
    imageOpen: null,
    imageClosed: null,
    numberReceived: 0,
    emergedInTransit: 0,
    damagedInTransit: 0,
    diseasedInTransit: 0,
    parasite: 0,
    nonEmergence: 0,
    poorEmergence: 0,
    inFlightQuantity: 0,
    ...overrides,
  };
}

describe("computeItemRemaining", () => {
  it("returns received minus losses minus in_flight in the normal case", () => {
    const item = makeItem({
      numberReceived: 50,
      damagedInTransit: 2,
      diseasedInTransit: 1,
      parasite: 1,
      nonEmergence: 3,
      poorEmergence: 1,
      inFlightQuantity: 10,
    });
    // 50 - (2+1+1+3+1) - 10 = 32
    expect(computeItemRemaining(item)).toBe(32);
  });

  it("returns 0 when everything has been released", () => {
    const item = makeItem({ numberReceived: 20, inFlightQuantity: 20 });
    expect(computeItemRemaining(item)).toBe(0);
  });

  it("returns 0 (clamped) when losses + released exceed received", () => {
    // Defensive: bad data shouldn't yield a negative remaining count that
    // would confuse downstream UI math.
    const item = makeItem({
      numberReceived: 10,
      damagedInTransit: 5,
      diseasedInTransit: 5,
      inFlightQuantity: 5,
    });
    expect(computeItemRemaining(item)).toBe(0);
  });

  it("returns 0 for an all-zero item", () => {
    expect(computeItemRemaining(makeItem())).toBe(0);
  });

  it("ignores emergedInTransit (it is informational, not a loss)", () => {
    // emerged_in_transit is a status indicator, not a deduction. The release
    // formula must not subtract it or we'd undercount remaining inventory.
    const item = makeItem({ numberReceived: 30, emergedInTransit: 12 });
    expect(computeItemRemaining(item)).toBe(30);
  });

  it("treats every loss column equally", () => {
    const lossColumns: Array<keyof ShipmentItemRow> = [
      "damagedInTransit",
      "diseasedInTransit",
      "parasite",
      "nonEmergence",
      "poorEmergence",
    ];
    for (const column of lossColumns) {
      const item = makeItem({ numberReceived: 10, [column]: 4 });
      expect(computeItemRemaining(item)).toBe(6);
    }
  });
});
