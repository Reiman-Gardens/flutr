"use client";

import { ReactNode } from "react";
import TenantHeader from "@/components/platform/layout/tenant/tenant-header";
import TenantSidebar from "@/components/platform/layout/tenant/tenant-sidebar";
import TenantFooter from "@/components/platform/layout/tenant/tenant-footer";

interface TenantLayoutClientProps {
  children: ReactNode;
  user?: {
    id: string;
    role: string;
    institutionId: number | null;
  };
  sessionUser?: {
    name?: string | null;
    image?: string | null;
  };
}

export function TenantLayoutClient({ children, user, sessionUser }: TenantLayoutClientProps) {
  return (
    <div className="bg-background fixed inset-0 flex flex-col overflow-hidden">
      <TenantHeader user={user} sessionUser={sessionUser} />

      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <TenantSidebar />
        <main id="main-content" className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>

      <TenantFooter />
    </div>
  );
}
