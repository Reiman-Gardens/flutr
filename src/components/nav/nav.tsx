"use client";

import { useSession } from "next-auth/react";
import { useIsMobile } from "@/hooks/use-mobile";
import { TopNav } from "./top-nav";
import { MobileNav } from "./mobile-nav";
import { PUBLIC_LINKS, AUTH_LINKS } from "./nav-links";

export function Navbar() {
  const isMobile = useIsMobile();
  const { status } = useSession();

  const isAuthenticated = status === "authenticated";
  const links = isAuthenticated ? AUTH_LINKS : PUBLIC_LINKS;

  return isMobile ? (
    <MobileNav links={links} isAuthenticated={isAuthenticated} />
  ) : (
    <TopNav links={links} isAuthenticated={isAuthenticated} />
  );
}
