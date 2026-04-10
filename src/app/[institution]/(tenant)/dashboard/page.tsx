import { Building2, Package } from "lucide-react";

import NavCard from "@/components/shared/nav-card";
import { ROUTES } from "@/lib/routes";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ institution: string }>;
}) {
  const { institution } = await params;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage your institution&apos;s shipments, releases, and organization settings.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
