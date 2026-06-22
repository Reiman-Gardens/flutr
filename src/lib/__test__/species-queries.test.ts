const mockInsert = jest.fn();
const mockOnConflictDoNothing = jest.fn();
const mockValues = jest.fn((rows: unknown[]) => ({ onConflictDoNothing: mockOnConflictDoNothing }));

jest.mock("@/lib/db", () => ({
  db: {
    insert: mockInsert,
  },
}));

import { butterfly_species_institution } from "@/lib/schema";
import { ensureSpeciesLinksForInstitution } from "@/lib/queries/species";

describe("species queries", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInsert.mockReturnValue({ values: mockValues });
    mockOnConflictDoNothing.mockResolvedValue(undefined);
  });

  it("ensures species links with onConflictDoNothing so existing overrides are preserved", async () => {
    await ensureSpeciesLinksForInstitution(7, [3, 5, 3]);

    expect(mockInsert).toHaveBeenCalledWith(butterfly_species_institution);
    expect(mockValues).toHaveBeenCalledWith([
      {
        institution_id: 7,
        butterfly_species_id: 3,
      },
      {
        institution_id: 7,
        butterfly_species_id: 5,
      },
    ]);
    expect(mockOnConflictDoNothing).toHaveBeenCalledWith({
      target: [
        butterfly_species_institution.butterfly_species_id,
        butterfly_species_institution.institution_id,
      ],
    });
  });

  it("supports transactional executors for manual shipment linking", async () => {
    const txInsert = jest.fn((_table?: unknown) => ({ values: mockValues }));

    await ensureSpeciesLinksForInstitution(11, [8], { insert: txInsert } as unknown as Parameters<
      typeof ensureSpeciesLinksForInstitution
    >[2]);

    expect(txInsert).toHaveBeenCalledWith(butterfly_species_institution);
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
