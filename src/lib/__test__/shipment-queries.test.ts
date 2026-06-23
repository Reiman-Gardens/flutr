const mockTransaction = jest.fn();

jest.mock("@/lib/db", () => ({
  db: {
    transaction: mockTransaction,
  },
}));

jest.mock("@/lib/queries/species", () => ({
  ensureSpeciesLinksForInstitution: jest.fn(),
}));

import { shipments, shipment_items } from "@/lib/schema";
import { createShipment, updateShipment } from "@/lib/queries/shipments";
import { ensureSpeciesLinksForInstitution } from "@/lib/queries/species";
import { createThenableQuery } from "@/__test__/api/_utils/mockDb";

const mockEnsureSpeciesLinksForInstitution = ensureSpeciesLinksForInstitution as jest.Mock;

function buildInsertStub() {
  const shipmentsReturning = jest.fn().mockResolvedValue([{ id: 101 }]);
  const shipmentValues = jest.fn(() => ({ returning: shipmentsReturning }));
  const itemValues = jest.fn().mockResolvedValue(undefined);

  const insert = jest.fn((table) => {
    if (table === shipments) {
      return { values: shipmentValues };
    }

    if (table === shipment_items) {
      return { values: itemValues };
    }

    throw new Error("Unexpected table");
  });

  return {
    insert,
    shipmentValues,
    shipmentsReturning,
    itemValues,
  };
}

describe("shipment queries", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("ensures institution-species links before inserting manual shipment items", async () => {
    const insertStub = buildInsertStub();
    const tx = {
      insert: insertStub.insert,
    };

    mockTransaction.mockImplementationOnce(async (callback) => callback(tx));

    const shipmentId = await createShipment(77, {
      supplier_code: "SUP-1",
      shipment_date: new Date("2026-06-10T00:00:00.000Z"),
      arrival_date: new Date("2026-06-11T00:00:00.000Z"),
      items: [
        {
          butterfly_species_id: 4,
          number_received: 12,
          emerged_in_transit: 1,
          damaged_in_transit: 0,
          diseased_in_transit: 0,
          parasite: 0,
          non_emergence: 0,
          poor_emergence: 0,
        },
        {
          butterfly_species_id: 9,
          number_received: 6,
          emerged_in_transit: 0,
          damaged_in_transit: 0,
          diseased_in_transit: 0,
          parasite: 0,
          non_emergence: 0,
          poor_emergence: 0,
        },
      ],
    });

    expect(shipmentId).toBe(101);
    expect(mockEnsureSpeciesLinksForInstitution).toHaveBeenCalledWith(77, [4, 9], tx);
    expect(insertStub.itemValues).toHaveBeenCalledWith([
      expect.objectContaining({
        institution_id: 77,
        shipment_id: 101,
        butterfly_species_id: 4,
      }),
      expect.objectContaining({
        institution_id: 77,
        shipment_id: 101,
        butterfly_species_id: 9,
      }),
    ]);
  });

  it("ensures institution-species links before adding manual shipment items on edit", async () => {
    const itemValues = jest.fn().mockResolvedValue(undefined);
    const tx = {
      select: jest.fn(() => createThenableQuery([{ id: 55 }])),
      insert: jest.fn((table) => {
        if (table === shipment_items) {
          return { values: itemValues };
        }

        throw new Error("Unexpected table");
      }),
      update: jest.fn(),
      delete: jest.fn(),
    };

    mockTransaction.mockImplementationOnce(async (callback) => callback(tx));

    const result = await updateShipment(77, 55, {
      add_items: [
        {
          butterfly_species_id: 12,
          number_received: 4,
          emerged_in_transit: 0,
          damaged_in_transit: 0,
          diseased_in_transit: 0,
          parasite: 0,
          non_emergence: 0,
          poor_emergence: 0,
        },
      ],
    });

    expect(result).toBe(true);
    expect(mockEnsureSpeciesLinksForInstitution).toHaveBeenCalledWith(77, [12], tx);
    expect(itemValues).toHaveBeenCalledWith([
      expect.objectContaining({
        institution_id: 77,
        shipment_id: 55,
        butterfly_species_id: 12,
      }),
    ]);
  });
});
