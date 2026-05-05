import { Building2, Package } from "lucide-react";

import NavCard from "@/components/shared/nav-card";
import { ROUTES } from "@/lib/routes";
import { DashboardHeader } from "./dashboard-header";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ institution: string }>;
}) {
  const { institution } = await params;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <DashboardHeader />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" data-onboarding="nav">
        <NavCard
          href={ROUTES.tenant.organization(institution)}
          title="Organization"
          description="Manage institution details and settings"
          icon={Building2}
        />

        <NavCard
          href={ROUTES.tenant.shipments(institution)}
          title="Shipments"
          description="Track shipments and record releases"
          icon={Package}
        />
      </div>
    </div>
  );
}
