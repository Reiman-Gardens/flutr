"use client";

import { TopNav } from "./top-nav";
import { MobileNav } from "./mobile-nav";
import {
  PUBLIC_LINKS,
  PUBLIC_MOBILE_LINKS,
  PUBLIC_MOBILE_MENU_LINKS,
  AUTH_LINKS,
} from "./nav-links";

interface NavbarProps {
  isAuthenticated: boolean;
}

export function Navbar({ isAuthenticated }: NavbarProps) {
  const links = isAuthenticated ? AUTH_LINKS : PUBLIC_LINKS;
  const mobileLinks = isAuthenticated ? AUTH_LINKS : PUBLIC_MOBILE_LINKS;
  const mobileMenuLinks = isAuthenticated ? [] : PUBLIC_MOBILE_MENU_LINKS;

  return (
    <>
      <TopNav links={links} isAuthenticated={isAuthenticated} className="hidden md:block" />
      <MobileNav links={mobileLinks} menuLinks={mobileMenuLinks} className="md:hidden" />
    </>
  );
}
