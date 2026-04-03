import { Building2, LayoutDashboard, Leaf, LogOut, LucideIcon, Package } from "lucide-react";
import { ROUTES } from "@/lib/routes";

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
}

export const PLATFORM_ROUTES = {
  dashboard: ROUTES.admin.dashboard,
  institutions: ROUTES.admin.institutions,
  species: ROUTES.admin.species,
  suppliers: ROUTES.admin.suppliers,
} as const;

/** Primary navigation items rendered in the sidebar. */
export const PLATFORM_NAV_ITEMS: readonly NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: PLATFORM_ROUTES.dashboard,
    icon: LayoutDashboard,
  },
  {
    id: "institutions",
    label: "Institutions",
    href: PLATFORM_ROUTES.institutions,
    icon: Building2,
  },
  {
    id: "species",
    label: "Butterflies",
    href: PLATFORM_ROUTES.species,
    icon: Leaf,
  },
  {
    id: "suppliers",
    label: "Suppliers",
    href: PLATFORM_ROUTES.suppliers,
    icon: Package,
  },
];

/** Bottom utility items rendered below the spacer. */
export const PLATFORM_BOTTOM_ITEMS: readonly NavItem[] = [];

/** Logout action — rendered as a button, not a link. */
export const LOGOUT_ITEM = {
  id: "logout",
  label: "Log out",
  icon: LogOut,
} as const;
