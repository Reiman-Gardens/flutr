import { auth } from "@/auth";
import { requireUser } from "@/lib/authz";
import { redirect } from "next/navigation";
import { TenantLayoutClient } from "./layout-client";

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
    <TenantLayoutClient user={user} sessionUser={session?.user}>
      {children}
    </TenantLayoutClient>
  );
}
