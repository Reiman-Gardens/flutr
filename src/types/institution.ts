import type { institutions } from "@/lib/schema";

type Institution = typeof institutions.$inferSelect;

export type SocialLinks = {
  x?: string;
  facebook?: string;
  instagram?: string;
  youtube?: string;
};

export type PublicInstitution = Pick<
  Institution,
  | "name"
  | "street_address"
  | "extended_address"
  | "city"
  | "state_province"
  | "postal_code"
  | "country"
  | "email_address"
  | "phone_number"
  | "website_url"
  | "logo_url"
> & {
  social_links?: SocialLinks | null;
};
