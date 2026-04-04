import type { LucideIcon } from "lucide-react";
import { Home, Image, BarChart3, Mail } from "lucide-react";

export interface NavLink {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const PUBLIC_LINKS: NavLink[] = [
  { label: "Home", href: "", icon: Home },
  { label: "Gallery", href: "/gallery", icon: Image },
  { label: "Stats", href: "/stats", icon: BarChart3 },
  { label: "Contact", href: "/contact", icon: Mail },
];

export const PUBLIC_MOBILE_LINKS: NavLink[] = [
  { label: "Home", href: "", icon: Home },
  { label: "Gallery", href: "/gallery", icon: Image },
  { label: "Stats", href: "/stats", icon: BarChart3 },
];

export const PUBLIC_MOBILE_MENU_LINKS: NavLink[] = [
  { label: "Contact", href: "/contact", icon: Mail },
];
