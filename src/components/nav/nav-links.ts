import type { LucideIcon } from "lucide-react";
import {
  Home,
  Image,
  BarChart3,
  LayoutDashboard,
  Package,
  Warehouse,
  TrendingUp,
} from "lucide-react";

export interface NavLink {
  label: string;
  href: string;
  icon: LucideIcon;
}

// TODO: Replace with real auth check
export const isAuthenticated = false;

const publicLinks: NavLink[] = [
  { label: "Home", href: "", icon: Home },
  { label: "Gallery", href: "/gallery", icon: Image },
  { label: "Stats", href: "/stats", icon: BarChart3 },
];

const authLinks: NavLink[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Shipments", href: "/shipments", icon: Package },
  { label: "Inventory", href: "/inventory", icon: Warehouse },
  { label: "Analytics", href: "/analytics", icon: TrendingUp },
];

export const NAV_LINKS: NavLink[] = isAuthenticated ? authLinks : publicLinks;
