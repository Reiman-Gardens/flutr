import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { canCrossTenant, requireUser } from "@/lib/authz";

export default async function PlatformLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  let user;
  try {
    user = requireUser(session);
  } catch {
    redirect("/");
  }

  if (!canCrossTenant(user)) {
    redirect("/");
  }

  return <>{children}</>;
}
