"use client";

import { usePathname } from "next/navigation";
import { useIsMobile } from "@/hooks/use-mobile";
import { TopNav } from "./top-nav";
import { MobileNav } from "./mobile-nav";

export function Navbar() {
  const isMobile = useIsMobile();
  const pathname = usePathname();

  if (pathname === "/") return null;

  return isMobile ? <MobileNav /> : <TopNav />;
}
