import {
  Building2,
  LayoutDashboard,
  LogOut,
  type LucideIcon,
  Newspaper,
  Package,
} from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  /** Relative path appended to the institution basePath (e.g. "/dashboard"). */
  href: string;
  icon: LucideIcon;
}

/** Primary navigation items rendered in the tenant sidebar. */
export const TENANT_NAV_ITEMS: readonly NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    id: "organization",
    label: "Organization",
    href: "/organization",
    icon: Building2,
  },
  {
    id: "shipments",
    label: "Shipments",
    href: "/shipments",
    icon: Package,
  },
  {
    id: "news",
    label: "News",
    href: "/news",
    icon: Newspaper,
  },
];

/** Logout action — rendered as a button, not a link. */
export const LOGOUT_ITEM = {
  id: "logout",
  label: "Log out",
  icon: LogOut,
} as const;
