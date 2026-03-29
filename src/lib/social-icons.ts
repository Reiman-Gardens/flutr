import { Twitter, Facebook, Instagram, Youtube } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { SocialLinks } from "@/types/institution";

export const SOCIAL_ICONS: { key: keyof SocialLinks; icon: LucideIcon; label: string }[] = [
  { key: "x", icon: Twitter, label: "X (Twitter)" },
  { key: "facebook", icon: Facebook, label: "Facebook" },
  { key: "instagram", icon: Instagram, label: "Instagram" },
  { key: "youtube", icon: Youtube, label: "YouTube" },
];
