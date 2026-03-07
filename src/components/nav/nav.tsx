"use client";

import { TopNav } from "./top-nav";
import { MobileNav } from "./mobile-nav";
import { PUBLIC_LINKS, AUTH_LINKS } from "./nav-links";

interface NavbarProps {
  isAuthenticated: boolean;
}

export function Navbar({ isAuthenticated }: NavbarProps) {
  const links = isAuthenticated ? AUTH_LINKS : PUBLIC_LINKS;

  return (
    <>
      <TopNav links={links} isAuthenticated={isAuthenticated} className="hidden md:block" />
      <MobileNav links={links} className="md:hidden" />
    </>
  );
}
