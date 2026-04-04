import { Building2, Leaf, Package } from "lucide-react";

import NavCard from "@/components/shared/nav-card";
import { PLATFORM_ROUTES } from "@/components/platform/layout/platform-nav-items";

export default function PlatformPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Platform Control Center</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage global platform data including institutions, species, and suppliers.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <NavCard
          href={PLATFORM_ROUTES.institutions}
          title="Institutions"
          description="Manage butterfly houses and onboarding"
          icon={Building2}
        />

        <NavCard
          href={PLATFORM_ROUTES.species}
          title="Butterflies"
          description="Manage the global butterfly species catalog"
          icon={Leaf}
        />

        <NavCard
          href={PLATFORM_ROUTES.suppliers}
          title="Suppliers"
          description="Manage the global supplier list"
          icon={Package}
        />
      </div>
    </div>
  );
}
