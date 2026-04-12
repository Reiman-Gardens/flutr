import { buildShipmentCompletionMap } from "@/lib/queries/shipments";

describe("buildShipmentCompletionMap", () => {
  it("returns remaining = grossAvailable when nothing is released", () => {
    const map = buildShipmentCompletionMap(
      [{ shipmentId: 1, itemCount: 2, grossAvailable: 30 }],
      [],
    );

    expect(map.get(1)).toEqual({ remaining: 30, isCompleted: false });
  });

  it("subtracts released totals from grossAvailable", () => {
    const map = buildShipmentCompletionMap(
      [{ shipmentId: 1, itemCount: 2, grossAvailable: 30 }],
      [{ shipmentId: 1, released: 12 }],
    );

    expect(map.get(1)).toEqual({ remaining: 18, isCompleted: false });
  });

  it("flags isCompleted when remaining hits zero AND items exist", () => {
    const map = buildShipmentCompletionMap(
      [{ shipmentId: 1, itemCount: 2, grossAvailable: 20 }],
      [{ shipmentId: 1, released: 20 }],
    );

    expect(map.get(1)).toEqual({ remaining: 0, isCompleted: true });
  });

  it("clamps remaining at zero when released exceeds grossAvailable", () => {
    // Shouldn't happen in practice, but the helper must never report a
    // negative remaining count.
    const map = buildShipmentCompletionMap(
      [{ shipmentId: 1, itemCount: 2, grossAvailable: 10 }],
      [{ shipmentId: 1, released: 25 }],
    );

    expect(map.get(1)).toEqual({ remaining: 0, isCompleted: true });
  });

  it("treats string numerics from PG as numbers", () => {
    // node-postgres can serialize bigint sums as strings if the ::int cast is
    // ever forgotten. The helper must coerce defensively.
    const map = buildShipmentCompletionMap(
      [{ shipmentId: 1, itemCount: 1, grossAvailable: "15" }],
      [{ shipmentId: 1, released: "5" }],
    );

    expect(map.get(1)).toEqual({ remaining: 10, isCompleted: false });
  });

  it("defaults shipments with no items to in-progress when shipmentIds is provided", () => {
    // Empty shipments are surfaced as "still has work to do" so users can fill
    // them in instead of seeing them as completed shells.
    const map = buildShipmentCompletionMap([], [], [1, 2, 3]);

    expect(map.get(1)).toEqual({ remaining: 0, isCompleted: false });
    expect(map.get(2)).toEqual({ remaining: 0, isCompleted: false });
    expect(map.get(3)).toEqual({ remaining: 0, isCompleted: false });
  });

  it("does not synthesize entries for missing shipments when shipmentIds is omitted", () => {
    const map = buildShipmentCompletionMap(
      [{ shipmentId: 1, itemCount: 1, grossAvailable: 10 }],
      [],
    );

    expect(map.has(1)).toBe(true);
    expect(map.has(2)).toBe(false);
  });

  it("handles multiple shipments independently", () => {
    const map = buildShipmentCompletionMap(
      [
        { shipmentId: 1, itemCount: 2, grossAvailable: 30 },
        { shipmentId: 2, itemCount: 1, grossAvailable: 15 },
      ],
      [
        { shipmentId: 1, released: 30 },
        { shipmentId: 2, released: 5 },
      ],
    );

    expect(map.get(1)).toEqual({ remaining: 0, isCompleted: true });
    expect(map.get(2)).toEqual({ remaining: 10, isCompleted: false });
  });

  it("does NOT mark itemCount=0 shipments as completed even when remaining=0", () => {
    // Guards against the bug where empty shipments could otherwise look "done"
    // because their gross available is also zero.
    const map = buildShipmentCompletionMap(
      [{ shipmentId: 1, itemCount: 0, grossAvailable: 0 }],
      [],
    );

    expect(map.get(1)).toEqual({ remaining: 0, isCompleted: false });
  });

  it("ignores released_rows for shipments not present in itemRows when shipmentIds is omitted", () => {
    // A released row without a matching item row would be a data integrity
    // bug, but the helper should not crash or create a bogus entry for it.
    const map = buildShipmentCompletionMap(
      [{ shipmentId: 1, itemCount: 1, grossAvailable: 10 }],
      [{ shipmentId: 99, released: 5 }],
    );

    expect(map.get(1)).toEqual({ remaining: 10, isCompleted: false });
    expect(map.has(99)).toBe(false);
  });
});
