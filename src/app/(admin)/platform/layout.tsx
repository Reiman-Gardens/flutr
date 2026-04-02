import { auth } from "@/auth";
import PlatformFooter from "@/components/platform/layout/platform-footer";
import PlatformHeader from "@/components/platform/layout/platform-header";
import PlatformSidebar from "@/components/platform/layout/platform-sidebar";
import { canCrossTenant, requireUser } from "@/lib/authz";
import { redirect } from "next/navigation";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  const user = (() => {
    try {
      return requireUser(session);
    } catch {
      redirect("/");
    }
  })();

  if (!canCrossTenant(user)) {
    redirect("/");
  }

  return (
    <div className="bg-background fixed inset-0 flex flex-col overflow-hidden">
      <PlatformHeader user={user} sessionUser={session?.user} />

      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <PlatformSidebar />
        <main id="main-content" className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      <PlatformFooter />
    </div>
  );
}
