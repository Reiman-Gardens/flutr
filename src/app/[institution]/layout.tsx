import { notFound } from "next/navigation";
import { getPublicInstitution } from "@/lib/queries/institution";
import { InstitutionDataProvider } from "@/components/providers/institution-provider";
import type { PublicInstitution } from "@/types/institution";

interface InstitutionLayoutProps {
  children: React.ReactNode;
  params: Promise<{ institution: string }>;
}

export default async function InstitutionLayout({ children, params }: InstitutionLayoutProps) {
  const { institution: slug } = await params;

  const row = await getPublicInstitution(slug);

  if (!row) notFound();

  const institution: PublicInstitution = {
    ...row,
    social_links: row.social_links as PublicInstitution["social_links"],
  };

  return <InstitutionDataProvider institution={institution}>{children}</InstitutionDataProvider>;
}
