import { auth } from "@/auth";
import { TenantLayoutClient } from "./layout-client";

export default async function TenantLayoutWrapper({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return <TenantLayoutClient sessionUser={session?.user}>{children}</TenantLayoutClient>;
}
