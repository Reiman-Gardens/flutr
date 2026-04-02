import {
  Building2,
  LayoutDashboard,
  Leaf,
  LogOut,
  LucideIcon,
  Package,
  Settings,
} from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
}

export const PLATFORM_ROUTES = {
  dashboard: "/platform",
  institutions: "/platform/institutions",
  species: "/platform/species",
  suppliers: "/platform/suppliers",
  settings: "/platform/settings",
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
export const PLATFORM_BOTTOM_ITEMS: readonly NavItem[] = [
  {
    id: "settings",
    label: "Settings",
    href: PLATFORM_ROUTES.settings,
    icon: Settings,
  },
];

/** Logout action — rendered as a button, not a link. */
export const LOGOUT_ITEM = {
  id: "logout",
  label: "Log out",
  icon: LogOut,
} as const;
