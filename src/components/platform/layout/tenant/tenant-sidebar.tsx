"use client";

import TenantNavList from "./tenant-nav-list";

export default function TenantSidebar() {
  return (
    <aside
      aria-label="Tenant sidebar"
      className="bg-background hidden min-h-0 w-56 shrink-0 border-r md:flex md:flex-col"
      data-onboarding="nav"
    >
      <TenantNavList />
    </aside>
  );
}
