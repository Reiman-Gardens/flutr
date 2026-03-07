import {
  getUniqueStates,
  filterInstitutions,
} from "@/components/public/root-home/institution-directory";
import type { InstitutionCardProps } from "@/components/public/root-home/institution-card";

const inst = (
  overrides: Partial<InstitutionCardProps> & Pick<InstitutionCardProps, "slug" | "name">,
): InstitutionCardProps => ({
  city: "Anytown",
  state_province: "Florida",
  country: "US",
  facility_image_url: null,
  logo_url: null,
  ...overrides,
});

const sampleInstitutions: InstitutionCardProps[] = [
  inst({ slug: "bw", name: "Butterfly World", city: "Coconut Creek", state_province: "Florida" }),
  inst({
    slug: "mw",
    name: "Magic Wings",
    city: "South Deerfield",
    state_province: "Massachusetts",
  }),
  inst({ slug: "kc", name: "Key West Conservatory", city: "Key West", state_province: "Florida" }),
  inst({
    slug: "pc",
    name: "Pacific Science Center",
    city: "Seattle",
    state_province: "Washington",
  }),
];

describe("getUniqueStates", () => {
  it("returns unique states sorted alphabetically", () => {
    expect(getUniqueStates(sampleInstitutions)).toEqual(["Florida", "Massachusetts", "Washington"]);
  });

  it("returns empty array for empty input", () => {
    expect(getUniqueStates([])).toEqual([]);
  });

  it("deduplicates repeated states", () => {
    const dupes = [
      inst({ slug: "a", name: "A", state_province: "Texas" }),
      inst({ slug: "b", name: "B", state_province: "Texas" }),
    ];
    expect(getUniqueStates(dupes)).toEqual(["Texas"]);
  });
});

describe("filterInstitutions", () => {
  it("returns all institutions sorted alphabetically with no filters", () => {
    const result = filterInstitutions(sampleInstitutions, "", "all");
    expect(result.map((i) => i.slug)).toEqual(["bw", "kc", "mw", "pc"]);
  });

  it("filters by name (case-insensitive)", () => {
    const result = filterInstitutions(sampleInstitutions, "magic", "all");
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("mw");
  });

  it("filters by city (case-insensitive)", () => {
    const result = filterInstitutions(sampleInstitutions, "seattle", "all");
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("pc");
  });

  it("filters by state", () => {
    const result = filterInstitutions(sampleInstitutions, "", "Florida");
    expect(result).toHaveLength(2);
    expect(result.map((i) => i.slug)).toEqual(["bw", "kc"]);
  });

  it("combines search and state filter", () => {
    const result = filterInstitutions(sampleInstitutions, "key", "Florida");
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("kc");
  });

  it("returns empty when search matches nothing", () => {
    expect(filterInstitutions(sampleInstitutions, "nonexistent", "all")).toEqual([]);
  });

  it("returns empty when state filter matches nothing", () => {
    expect(filterInstitutions(sampleInstitutions, "", "Alaska")).toEqual([]);
  });

  it("returns empty for empty institutions", () => {
    expect(filterInstitutions([], "", "all")).toEqual([]);
  });

  it("matches partial name substrings", () => {
    const result = filterInstitutions(sampleInstitutions, "Conserv", "all");
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("kc");
  });
});
