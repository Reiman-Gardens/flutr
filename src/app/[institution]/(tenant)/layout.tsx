import { auth } from "@/auth";
import { requireUser } from "@/lib/authz";
import { redirect } from "next/navigation";
import TenantHeader from "@/components/platform/layout/tenant/tenant-header";
import TenantSidebar from "@/components/platform/layout/tenant/tenant-sidebar";
import TenantFooter from "@/components/platform/layout/tenant/tenant-footer";

export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  const user = (() => {
    try {
      return requireUser(session);
    } catch {
      redirect("/login");
    }
  })();

  return (
    <div className="bg-background fixed inset-0 flex flex-col overflow-hidden">
      <TenantHeader user={user} sessionUser={session?.user} />

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
