import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { institutions } from "@/lib/schema";
import { Navbar } from "@/components/nav/nav";
import { Footer } from "@/components/nav/footer";
import { InstitutionDataProvider } from "@/components/providers/institution-provider";
import type { PublicInstitution } from "@/types/institution";

interface InstitutionLayoutProps {
  children: React.ReactNode;
  params: Promise<{ institution: string }>;
}

export default async function InstitutionLayout({ children, params }: InstitutionLayoutProps) {
  const [{ institution: slug }, session] = await Promise.all([params, auth()]);

  const [row] = await db
    .select({
      name: institutions.name,
      street_address: institutions.street_address,
      extended_address: institutions.extended_address,
      city: institutions.city,
      state_province: institutions.state_province,
      postal_code: institutions.postal_code,
      country: institutions.country,
      email_address: institutions.email_address,
      phone_number: institutions.phone_number,
      website_url: institutions.website_url,
      logo_url: institutions.logo_url,
      social_links: institutions.social_links,
    })
    .from(institutions)
    .where(and(eq(institutions.slug, slug), eq(institutions.stats_active, true)))
    .limit(1);

  if (!row) notFound();

  const institution: PublicInstitution = {
    ...row,
    social_links: row.social_links as PublicInstitution["social_links"],
  };

  return (
    <InstitutionDataProvider institution={institution}>
      <Navbar isAuthenticated={!!session} />
      <main id="main-content" className="flex-1 pb-20 md:pb-6">
        {children}
      </main>
      <Footer />
    </InstitutionDataProvider>
  );
}
