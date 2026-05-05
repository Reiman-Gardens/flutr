import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getPublicInstitution } from "@/lib/queries/institution";
import { getOrCreateUserOnboarding } from "@/lib/queries/onboarding";
import { InstitutionDataProvider } from "@/components/providers/institution-provider";
import { InstitutionLayoutClient } from "./layout-client";
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

  // Load onboarding state if user is authenticated and belongs to this institution
  let onboardingState = null;
  const session = await auth();
  if (session?.user && session.user.institutionId === institution.id) {
    try {
      const userId = Number(session.user.id);
      const institutionId = session.user.institutionId;
      onboardingState = await getOrCreateUserOnboarding(userId, institutionId);
    } catch (error) {
      console.error("Error loading onboarding state:", error);
    }
  }

  return (
    <InstitutionDataProvider institution={institution}>
      <InstitutionLayoutClient initialOnboardingState={onboardingState}>
        {children}
      </InstitutionLayoutClient>
    </InstitutionDataProvider>
  );
}
