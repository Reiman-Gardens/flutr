import type { LucideIcon } from "lucide-react";
import {
  Home,
  Heart,
  Image,
  BarChart3,
  HandHeart,
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

export const PUBLIC_LINKS: NavLink[] = [
  { label: "Home", href: "", icon: Home },
  { label: "About", href: "/about", icon: Heart },
  { label: "Gallery", href: "/gallery", icon: Image },
  { label: "Stats", href: "/stats", icon: BarChart3 },
  { label: "Volunteer", href: "/volunteer", icon: HandHeart },
];

export const AUTH_LINKS: NavLink[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Shipments", href: "/shipments", icon: Package },
  { label: "Inventory", href: "/inventory", icon: Warehouse },
  { label: "Analytics", href: "/analytics", icon: TrendingUp },
];
