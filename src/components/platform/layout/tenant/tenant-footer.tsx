"use client";

import { useInstitutionData } from "@/components/providers/institution-provider";

export default function TenantFooter() {
  const institution = useInstitutionData();
  const year = new Date().getUTCFullYear();

  return (
    <footer
      aria-label="Tenant footer"
      className="bg-background flex shrink-0 items-center border-t px-6 py-3"
    >
      <p className="text-muted-foreground text-xs">
        &copy; {year} {institution?.name ?? "Flutr"}
      </p>
    </footer>
  );
}
