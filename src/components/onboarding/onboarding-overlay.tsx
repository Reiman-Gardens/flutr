"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useOnboarding } from "@/components/providers/onboarding-provider";
import { ONBOARDING_STEPS, getNextStep, getPrevStep } from "@/types/onboarding";
import { Button } from "@/components/ui/button";
import { X, ChevronRight, ChevronLeft } from "lucide-react";

interface HighlightBox {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function OnboardingOverlay() {
  const router = useRouter();
  const { state, isLoading, completeStep, skipTour } = useOnboarding();
  const [highlightBox, setHighlightBox] = useState<HighlightBox | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const currentStepConfig = state ? ONBOARDING_STEPS[state.currentStep] : null;

  useEffect(() => {
    if (!currentStepConfig || !currentStepConfig.highlights.length) return;

    const updateHighlight = () => {
      const firstHighlight = currentStepConfig.highlights[0];
      const element = document.querySelector(firstHighlight.selector);

      if (element) {
        const rect = element.getBoundingClientRect();
        setHighlightBox({
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height,
        });
      }
    };

    updateHighlight();
    window.addEventListener("resize", updateHighlight);
    return () => window.removeEventListener("resize", updateHighlight);
  }, [currentStepConfig]);

  if (!state || state.tourCompleted || !currentStepConfig) {
    return null;
  }

  const nextStep = getNextStep(state.currentStep);
  const prevStep = getPrevStep(state.currentStep);
  const isLastStep = nextStep === null;

  const handleNext = async () => {
    await completeStep(nextStep);

    // Navigate to next step's page if it exists
    if (nextStep) {
      const nextStepConfig = ONBOARDING_STEPS[nextStep];
      if (nextStepConfig) {
        // Get current institution slug from URL
        const pathParts = window.location.pathname.split("/");
        const institutionSlug = pathParts[1];

        // Build the navigation URL based on step's pagePattern
        let navigationUrl = nextStepConfig.pagePattern;

        // Handle gallery as public route
        if (navigationUrl === "/gallery") {
          navigationUrl = `/${institutionSlug}/gallery`;
        } else {
          // Tenant routes (dashboard, shipments, organization, etc.)
          navigationUrl = `/${institutionSlug}${navigationUrl}`;
        }

        // Navigate to the next step
        router.push(navigationUrl);
      }
    }
  };

  const handlePrev = async () => {
    if (prevStep) {
      await completeStep(prevStep, true);

      // Navigate to previous step's page
      const prevStepConfig = ONBOARDING_STEPS[prevStep];
      if (prevStepConfig) {
        // Get current institution slug from URL
        const pathParts = window.location.pathname.split("/");
        const institutionSlug = pathParts[1];

        // Build the navigation URL based on step's pagePattern
        let navigationUrl = prevStepConfig.pagePattern;

        // Handle gallery as public route
        if (navigationUrl === "/gallery") {
          navigationUrl = `/${institutionSlug}/gallery`;
        } else {
          // Tenant routes (dashboard, shipments, organization, etc.)
          navigationUrl = `/${institutionSlug}${navigationUrl}`;
        }

        // Navigate to the previous step
        router.push(navigationUrl);
      }
    }
  };

  return (
    <>
      {/* Dark overlay - lighter when content is missing */}
      <div
        className={`fixed inset-0 z-40 transition-opacity ${
          !highlightBox ? "bg-black/30" : "bg-black/50"
        }`}
        ref={overlayRef}
      />

      {/* Highlight box - only show if element exists */}
      {highlightBox && (
        <div
          className="pointer-events-none absolute z-50 rounded-lg border-2 border-emerald-400 shadow-lg shadow-emerald-400/50 transition-all duration-300"
          style={{
            top: `${highlightBox.top - 8}px`,
            left: `${highlightBox.left - 8}px`,
            width: `${highlightBox.width + 16}px`,
            height: `${highlightBox.height + 16}px`,
          }}
        />
      )}

      {/* Tooltip and controls */}
      <div
        className="animate-in fade-in slide-in-from-bottom-4 fixed z-50 max-w-md rounded-lg bg-white p-6 shadow-2xl"
        style={{
          bottom: "2rem",
          right: "2rem",
        }}
      >
        {/* Close button */}
        <button
          onClick={() => skipTour()}
          disabled={isLoading}
          className="absolute top-4 right-4 rounded-md p-1 transition-colors hover:bg-gray-100"
          aria-label="Close tour"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Step counter */}
        <div className="mb-2 text-sm text-gray-500">
          Step {Object.values(ONBOARDING_STEPS).findIndex((s) => s.id === state.currentStep) + 1} of{" "}
          {Object.keys(ONBOARDING_STEPS).length}
        </div>

        {/* Title */}
        <h2 className="mb-2 text-xl font-bold text-gray-900">{currentStepConfig.title}</h2>

        {/* Description */}
        <p className="mb-4 text-sm text-gray-600">{currentStepConfig.description}</p>

        {/* Highlights */}
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-4">
          <h3 className="mb-3 text-sm font-semibold text-emerald-900">
            {currentStepConfig.instruction}
          </h3>

          {!highlightBox && (
            <div className="mb-3 rounded border border-yellow-200 bg-yellow-50 p-2 text-xs text-yellow-800">
              <p className="font-medium">💡 Quick Tip:</p>
              <p>
                {currentStepConfig.id === "gallery"
                  ? "Once you add shipments, species will appear here automatically."
                  : currentStepConfig.id === "news"
                    ? "You can manage news from your organization settings."
                    : "The highlighted section will appear once data is available."}
              </p>
            </div>
          )}

          <div className="space-y-2">
            {currentStepConfig.highlights.map((highlight, idx) => (
              <div key={idx} className="text-sm">
                <p className="font-medium text-emerald-700">{highlight.label}</p>
                <p className="text-xs text-emerald-600">{highlight.tooltip}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-between gap-2">
          <div className="flex gap-2">
            {prevStep && (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrev}
                disabled={isLoading}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => skipTour()} disabled={isLoading}>
              Skip
            </Button>
          </div>

          <Button
            size="sm"
            onClick={handleNext}
            disabled={isLoading}
            className="gap-1 bg-emerald-600 hover:bg-emerald-700"
          >
            {isLastStep ? "Complete" : "Next"}
            {!isLastStep && <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </>
  );
}
