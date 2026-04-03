import InstitutionsClient from "@/components/platform/institutions/institutions-client";
import { getAllInstitutions } from "@/lib/queries/institution";

export default async function PlatformInstitutionsPage() {
  const raw = await getAllInstitutions();

  const institutions = raw.map((i) => {
    // NOTE: This status is derived from stats visibility, not a separate account suspension field.
    const statsVisibleOnPublicPages = i.stats_active;
    const status = statsVisibleOnPublicPages ? ("ACTIVE" as const) : ("SUSPENDED" as const);

    return {
      id: i.id,
      name: i.name,
      slug: i.slug,
      city: i.city,
      state_province: i.state_province,
      country: i.country,
      email_address: i.email_address,
      logo_url: i.logo_url,
      created_at: i.created_at.toISOString(),
      status,
    };
  });
  return <InstitutionsClient institutions={institutions} />;
}
