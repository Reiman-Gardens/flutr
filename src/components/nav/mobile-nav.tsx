"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useInstitution } from "@/hooks/use-institution";
import { NAV_LINKS } from "./nav-links";

export function MobileNav() {
  const { basePath } = useInstitution();
  const pathname = usePathname();

  return (
    <nav
      aria-label="Mobile navigation"
      className="bg-background/95 supports-backdrop-filter:bg-background/60 fixed bottom-0 left-0 z-50 w-full border-t backdrop-blur"
    >
      <div className="flex h-16 items-center justify-around">
        {NAV_LINKS.map((link) => {
          const href = `${basePath}${link.href}`;
          const isActive = link.href === "" ? pathname === basePath : pathname.startsWith(href);
          const Icon = link.icon;

          return (
            <Link
              key={link.label}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 rounded-md px-3 py-2 text-xs font-medium transition-colors",
                "hover:text-accent-foreground",
                "focus-visible:ring-ring/50 focus-visible:ring-2 focus-visible:outline-none",
                isActive ? "text-foreground" : "text-muted-foreground",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="size-5" aria-hidden="true" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
