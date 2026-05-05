"use client";

import { ReactNode } from "react";
import { OnboardingProvider } from "@/components/providers/onboarding-provider";
import { OnboardingOverlay } from "@/components/onboarding/onboarding-overlay";
import type { UserOnboardingState } from "@/types/onboarding";

interface InstitutionLayoutClientProps {
  children: ReactNode;
  initialOnboardingState: UserOnboardingState | null;
}

export function InstitutionLayoutClient({
  children,
  initialOnboardingState,
}: InstitutionLayoutClientProps) {
  return (
    <OnboardingProvider initialState={initialOnboardingState}>
      {children}
      {/* Onboarding overlay available on all institution routes */}
      <OnboardingOverlay />
    </OnboardingProvider>
  );
}
