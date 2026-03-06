"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bug } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInstitution } from "@/hooks/use-institution";
import { NAV_LINKS, isAuthenticated } from "./nav-links";

export function TopNav() {
  const { basePath } = useInstitution();
  const pathname = usePathname();

  return (
    <header className="bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
      <div className="relative mx-auto flex h-14 max-w-[90vw] items-center px-4 sm:px-6 lg:px-8">
        <Link
          href={isAuthenticated ? `${basePath}/dashboard` : basePath}
          className="z-10 flex items-center gap-2 font-semibold"
          aria-label={isAuthenticated ? "Flutr dashboard" : "Flutr home"}
        >
          <Bug className="size-5" aria-hidden="true" />
          <span>Flutr</span>
        </Link>

        <nav
          aria-label="Main navigation"
          className="absolute inset-x-0 flex items-center justify-center gap-1"
        >
          {NAV_LINKS.map((link) => {
            const href = `${basePath}${link.href}`;
            const isActive = link.href === "" ? pathname === basePath : pathname.startsWith(href);

            return (
              <Link
                key={link.label}
                href={href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  "focus-visible:ring-ring/50 focus-visible:ring-2 focus-visible:outline-none",
                  isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
