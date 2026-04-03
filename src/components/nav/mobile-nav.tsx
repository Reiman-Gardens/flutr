"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { EllipsisVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInstitution } from "@/hooks/use-institution";
import type { NavLink } from "./nav-links";
import { MobileThemeToggle } from "@/components/shared/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MobileNavProps {
  links: NavLink[];
  menuLinks: NavLink[];
  className?: string;
}

const navItemClass = cn(
  "flex flex-col items-center gap-1 rounded-md px-3 py-2 text-xs font-medium transition-colors",
  "hover:text-primary hover:font-bold",
  "focus-visible:ring-ring/50 focus-visible:ring-2 focus-visible:outline-none",
);

export function MobileNav({ links, menuLinks, className }: MobileNavProps) {
  const { basePath } = useInstitution();
  const pathname = usePathname();

  const hasMenuLinks = menuLinks.length > 0;

  return (
    <nav
      aria-label="Mobile navigation"
      className={cn("bg-background fixed bottom-0 left-0 z-50 w-full border-t", className)}
    >
      <div className="flex h-16 items-center justify-around">
        {links.map((link) => {
          const href = `${basePath}${link.href}`;
          const isActive = link.href === "" ? pathname === basePath : pathname.startsWith(href);
          const Icon = link.icon;

          return (
            <Link
              key={link.label}
              href={href}
              className={cn(
                navItemClass,
                "flex-1",
                isActive ? "text-primary font-bold" : "text-muted-foreground",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="size-5" aria-hidden="true" />
              <span>{link.label}</span>
            </Link>
          );
        })}

        <DropdownMenu>
          <DropdownMenuTrigger
            className="text-muted-foreground hover:text-primary focus-visible:ring-ring/50 flex items-center justify-center rounded-md px-3 py-3 transition-colors focus-visible:ring-2 focus-visible:outline-none"
            aria-label="More options"
          >
            <EllipsisVertical className="size-6" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" sideOffset={12} collisionPadding={8}>
            {hasMenuLinks &&
              menuLinks.map((link) => {
                const href = `${basePath}${link.href}`;
                const isActive = pathname.startsWith(href);
                const Icon = link.icon;

                return (
                  <DropdownMenuItem key={link.label} asChild>
                    <Link
                      href={href}
                      className="flex items-center gap-2"
                      aria-current={isActive ? "page" : undefined}
                    >
                      <Icon className="size-4" aria-hidden="true" />
                      <span>{link.label}</span>
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            <MobileThemeToggle />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
