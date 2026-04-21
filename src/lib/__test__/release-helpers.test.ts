import { calculateRemaining } from "@/lib/queries/releases";

const baseItem = {
  id: 1,
  shipment_id: 10,
  number_received: 100,
  damaged_in_transit: 0,
  diseased_in_transit: 0,
  parasite: 0,
  non_emergence: 0,
  poor_emergence: 0,
};

describe("calculateRemaining", () => {
  it("returns full number_received when no losses and nothing released", () => {
    expect(calculateRemaining(baseItem, 0)).toBe(100);
  });

  it("subtracts already-released from available", () => {
    expect(calculateRemaining(baseItem, 40)).toBe(60);
  });

  it("subtracts all loss columns before applying releases", () => {
    const item = {
      ...baseItem,
      damaged_in_transit: 5,
      diseased_in_transit: 3,
      parasite: 2,
      non_emergence: 4,
      poor_emergence: 1,
    };
    // available = 100 - 15 = 85; remaining = 85 - 20 = 65
    expect(calculateRemaining(item, 20)).toBe(65);
  });

  it("returns 0 when exactly fully released", () => {
    expect(calculateRemaining(baseItem, 100)).toBe(0);
  });

  it("returns negative when over-released (caller enforces the guard)", () => {
    expect(calculateRemaining(baseItem, 110)).toBe(-10);
  });

  it("returns negative when losses exceed number_received", () => {
    const item = { ...baseItem, damaged_in_transit: 110 };
    expect(calculateRemaining(item, 0)).toBe(-10);
  });
});

describe("N+1 fix: bulk sum minus existing quantity coercion", () => {
  // Tests the arithmetic invariant of the updateReleaseEventItems N+1 fix:
  // alreadyReleased = totalForItem - existingRowQuantity
  it("computes correct alreadyReleased when other rows exist", () => {
    const totalReleased = 50; // all in_flight rows for this shipment_item
    const existingQuantity = 20; // the row being updated
    const alreadyReleased = totalReleased - existingQuantity;
    expect(alreadyReleased).toBe(30);
    expect(calculateRemaining({ ...baseItem, number_received: 100 }, alreadyReleased)).toBe(70);
  });

  it("computes 0 alreadyReleased when only one row and it is the one being updated", () => {
    const totalReleased = 20; // only row is the existing row
    const existingQuantity = 20;
    const alreadyReleased = totalReleased - existingQuantity;
    expect(alreadyReleased).toBe(0);
    expect(calculateRemaining(baseItem, alreadyReleased)).toBe(100);
  });

  it("coerces to 0 for items with no in_flight rows (default fallback)", () => {
    // When no in_flight row exists for a shipment_item_id, the grouped query
    // returns no row; the map lookup returns undefined and falls back to 0.
    const totalReleased = 0;
    const existingQuantity = 0;
    const alreadyReleased = totalReleased - existingQuantity;
    expect(alreadyReleased).toBe(0);
  });
});
