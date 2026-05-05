"use client";

import { createContext, useContext, useCallback, useState, ReactNode } from "react";
import type { UserOnboardingState, OnboardingStep } from "@/types/onboarding";

interface OnboardingContextType {
  state: UserOnboardingState | null;
  isLoading: boolean;
  completeStep: (nextStep: OnboardingStep | null, isBackNavigation?: boolean) => Promise<void>;
  resetTour: () => Promise<void>;
  skipTour: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({
  children,
  initialState,
}: {
  children: ReactNode;
  initialState: UserOnboardingState | null;
}) {
  const [state, setState] = useState<UserOnboardingState | null>(initialState);
  const [isLoading, setIsLoading] = useState(false);

  const completeStep = useCallback(
    async (nextStep: OnboardingStep | null, isBackNavigation?: boolean) => {
      if (!state) return;

      setIsLoading(true);
      try {
        const response = await fetch("/api/onboarding/complete-step", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            completedStep: state.currentStep,
            nextStep,
            isBackNavigation: isBackNavigation || false,
          }),
        });

        if (!response.ok) throw new Error("Failed to update progress");

        const updated = await response.json();
        setState(updated);
      } catch (error) {
        console.error("Error completing step:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [state],
  );

  const resetTour = useCallback(async () => {
    if (!state) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/onboarding/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) throw new Error("Failed to reset tour");

      const reset = await response.json();
      setState(reset);
    } catch (error) {
      console.error("Error resetting tour:", error);
    } finally {
      setIsLoading(false);
    }
  }, [state]);

  const skipTour = useCallback(async () => {
    if (!state) return;

    setIsLoading(true);
    try {
      // Mark tour as completed by completing the last step with no next
      const response = await fetch("/api/onboarding/complete-step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completedStep: state.currentStep,
          nextStep: null,
        }),
      });

      if (!response.ok) throw new Error("Failed to skip tour");

      const updated = await response.json();
      setState(updated);
    } catch (error) {
      console.error("Error skipping tour:", error);
    } finally {
      setIsLoading(false);
    }
  }, [state]);

  return (
    <OnboardingContext.Provider value={{ state, isLoading, completeStep, resetTour, skipTour }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return context;
}
