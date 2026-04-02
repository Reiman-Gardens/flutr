"use client";

import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import Link from "next/link";

import {
  LOGOUT_ITEM,
  PLATFORM_BOTTOM_ITEMS,
  PLATFORM_NAV_ITEMS,
  NavItem,
} from "./platform-nav-items";

function isActive(href: string, pathname: string): boolean {
  if (href === "/platform") {
    return pathname === "/platform";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarNavItem({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(item.href, pathname);
  const Icon = item.icon;

  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
          active
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        {item.label}
      </Link>
    </li>
  );
}

export default function PlatformSidebar() {
  const pathname = usePathname();

  async function handleLogout() {
    await signOut({ redirectTo: "/login" });
  }

  const LogoutIcon = LOGOUT_ITEM.icon;

  return (
    <aside className="bg-background flex min-h-0 w-56 shrink-0 flex-col border-r">
      {/* Navigation */}
      <nav aria-label="Platform navigation" className="flex flex-1 flex-col overflow-y-auto p-3">
        {/* Primary items */}
        <ul className="flex-1 space-y-1">
          {PLATFORM_NAV_ITEMS.map((item) => (
            <SidebarNavItem key={item.href} item={item} pathname={pathname} />
          ))}
        </ul>

        {/* Bottom utility items */}
        <ul className="space-y-1 pt-3">
          {PLATFORM_BOTTOM_ITEMS.map((item) => (
            <SidebarNavItem key={item.href} item={item} pathname={pathname} />
          ))}
          <li>
            <button
              onClick={handleLogout}
              aria-label="Log out"
              className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <LogoutIcon className="size-4 shrink-0" aria-hidden="true" />
              {LOGOUT_ITEM.label}
            </button>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
