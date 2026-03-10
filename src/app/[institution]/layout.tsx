import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getPublicInstitution } from "@/lib/queries/institution";
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

  const row = await getPublicInstitution(slug);

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
