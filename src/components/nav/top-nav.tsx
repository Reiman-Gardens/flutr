"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useInstitution } from "@/hooks/use-institution";
import { useInstitutionData } from "@/components/providers/institution-provider";
import type { NavLink } from "./nav-links";

interface TopNavProps {
  links: NavLink[];
  isAuthenticated: boolean;
  className?: string;
}

export function TopNav({ links, isAuthenticated, className }: TopNavProps) {
  const { basePath } = useInstitution();
  const pathname = usePathname();
  const institution = useInstitutionData();

  return (
    <header
      className={cn(
        "bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur",
        className,
      )}
    >
      <div className="relative mx-auto flex h-14 max-w-[90vw] items-center px-4 sm:px-6 lg:px-8">
        <Link
          href={isAuthenticated ? `${basePath}/dashboard` : basePath}
          className="z-10 flex items-center gap-2 font-semibold"
          aria-label={
            institution?.name ? `${institution.name} home` : isAuthenticated ? "Dashboard" : "Home"
          }
        >
          {institution?.logo_url ? (
            <Image
              src={institution.logo_url}
              alt={institution.name}
              width={32}
              height={32}
              sizes="(max-width: 640px) 24px, (max-width: 1024px) 28px, 32px"
              className="size-6 object-contain sm:size-7 lg:size-8"
            />
          ) : (
            <span>{institution?.name ?? "Flutr"}</span>
          )}
        </Link>

        <nav
          aria-label="Main navigation"
          className="absolute inset-x-0 flex items-center justify-center gap-1"
        >
          {links.map((link) => {
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
