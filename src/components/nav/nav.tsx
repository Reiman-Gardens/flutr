"use client";

import { TopNav } from "./top-nav";
import { MobileNav } from "./mobile-nav";
import { PUBLIC_LINKS, PUBLIC_MOBILE_LINKS, PUBLIC_MOBILE_MENU_LINKS } from "./nav-links";

export function Navbar() {
  return (
    <>
      <TopNav links={PUBLIC_LINKS} className="hidden md:block" />
      <MobileNav
        links={PUBLIC_MOBILE_LINKS}
        menuLinks={PUBLIC_MOBILE_MENU_LINKS}
        className="md:hidden"
      />
    </>
  );
}
