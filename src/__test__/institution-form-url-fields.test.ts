import { pickInstitutionUrlFields } from "@/lib/institution-form-url-fields";

describe("institution form URL field normalization", () => {
  it("omits blank and whitespace donation/volunteer URLs from payload", () => {
    const payload = pickInstitutionUrlFields({
      volunteer_url: "   ",
      donation_url: "",
    });

    expect(payload).toEqual({});
    expect("volunteer_url" in payload).toBe(false);
    expect("donation_url" in payload).toBe(false);
  });

  it("trims and preserves valid URL values", () => {
    const payload = pickInstitutionUrlFields({
      volunteer_url: "  https://example.org/volunteer  ",
      donation_url: " https://example.org/donate ",
    });

    expect(payload).toEqual({
      volunteer_url: "https://example.org/volunteer",
      donation_url: "https://example.org/donate",
    });
  });
});
