"use client";

import { useOnboarding } from "@/components/providers/onboarding-provider";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

export function ReplayTourButton() {
  const { resetTour, isLoading } = useOnboarding();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => resetTour()}
      disabled={isLoading}
      className="gap-2"
    >
      <RotateCcw className="h-4 w-4" />
      Replay Tour
    </Button>
  );
}
