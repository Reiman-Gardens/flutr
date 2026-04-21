import {
  normalizeExternalHttpUrl,
  resolveInstitutionInvolvementLinks,
} from "@/lib/institution-links";

describe("normalizeExternalHttpUrl", () => {
  it("returns null for blank and non-http(s) URLs", () => {
    expect(normalizeExternalHttpUrl("")).toBeNull();
    expect(normalizeExternalHttpUrl("   ")).toBeNull();
    expect(normalizeExternalHttpUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeExternalHttpUrl("ftp://example.org")).toBeNull();
  });

  it("trims and returns valid http(s) URLs", () => {
    expect(normalizeExternalHttpUrl("  https://example.org/path ")).toBe(
      "https://example.org/path",
    );
    expect(normalizeExternalHttpUrl("http://example.org")).toBe("http://example.org");
  });
});

describe("institution involvement link resolution", () => {
  it("does not produce actionable links for blank or whitespace values", () => {
    const links = resolveInstitutionInvolvementLinks({
      volunteer_url: "   ",
      donation_url: "",
    });

    expect(links.hasVolunteerUrl).toBe(false);
    expect(links.hasDonationUrl).toBe(false);
    expect(links.volunteerUrl).toBeNull();
    expect(links.donationUrl).toBeNull();
  });

  it("does not produce actionable links for non-http protocols", () => {
    const links = resolveInstitutionInvolvementLinks({
      volunteer_url: "javascript:alert(1)",
      donation_url: "ftp://example.org/donate",
    });

    expect(links.hasVolunteerUrl).toBe(false);
    expect(links.hasDonationUrl).toBe(false);
    expect(links.volunteerUrl).toBeNull();
    expect(links.donationUrl).toBeNull();
  });

  it("trims and accepts valid http/https links", () => {
    const links = resolveInstitutionInvolvementLinks({
      volunteer_url: "  https://example.org/volunteer  ",
      donation_url: "http://example.org/donate",
    });

    expect(links.hasVolunteerUrl).toBe(true);
    expect(links.hasDonationUrl).toBe(true);
    expect(links.volunteerUrl).toBe("https://example.org/volunteer");
    expect(links.donationUrl).toBe("http://example.org/donate");
  });
});
