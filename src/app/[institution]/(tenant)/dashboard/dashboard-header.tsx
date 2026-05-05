"use client";

import { ReplayTourButton } from "@/components/onboarding/replay-tour-button";

export function DashboardHeader() {
  return (
    <div className="mb-8 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage your institution&apos;s shipments, releases, and organization settings.
        </p>
      </div>
      <ReplayTourButton />
    </div>
  );
}
