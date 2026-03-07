import Link from "next/link";
import { Mail, Phone, Twitter, Facebook, Instagram, Youtube } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useInstitution } from "@/hooks/use-institution";
import { PUBLIC_LINKS } from "@/components/nav/nav-links";
import type { PublicInstitution, SocialLinks } from "@/types/institution";

const socialIcons: { key: keyof SocialLinks; icon: LucideIcon; label: string }[] = [
  { key: "x", icon: Twitter, label: "X (Twitter)" },
  { key: "facebook", icon: Facebook, label: "Facebook" },
  { key: "instagram", icon: Instagram, label: "Instagram" },
  { key: "youtube", icon: Youtube, label: "YouTube" },
];

export function InstitutionFooter({ institution }: { institution: PublicInstitution }) {
  const { basePath } = useInstitution();

  const activeSocials = socialIcons.filter((s) => institution.social_links?.[s.key]);

  return (
    <div className="grid gap-10 md:grid-cols-2">
      {/* Column 1: Institution Info */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">{institution.name}</h3>
        <address className="text-muted-foreground text-sm leading-relaxed not-italic">
          <p>{institution.street_address}</p>
          {institution.extended_address && <p>{institution.extended_address}</p>}
          <p>
            {institution.city}, {institution.state_province} {institution.postal_code}
          </p>
          <p>{institution.country}</p>
        </address>
        <div className="text-muted-foreground space-y-1 text-sm">
          {institution.email_address && (
            <a
              href={`mailto:${institution.email_address}`}
              className="hover:text-foreground flex items-center gap-2 transition-colors"
            >
              <Mail className="size-4" aria-hidden="true" />
              {institution.email_address}
            </a>
          )}
          {institution.phone_number && (
            <a
              href={`tel:${institution.phone_number}`}
              className="hover:text-foreground flex items-center gap-2 transition-colors"
            >
              <Phone className="size-4" aria-hidden="true" />
              {institution.phone_number}
            </a>
          )}
        </div>
        {activeSocials.length > 0 && (
          <div className="flex items-center gap-3 pt-1">
            {activeSocials.map((social) => {
              const Icon = social.icon;
              const url = institution.social_links![social.key]!;
              return (
                <a
                  key={social.key}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={`${social.label} (opens in new tab)`}
                >
                  <Icon className="size-5" aria-hidden="true" />
                </a>
              );
            })}
          </div>
        )}
      </div>

      {/* Column 2: Explore */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Explore</h3>
        <nav aria-label="Footer navigation" className="flex flex-col gap-2">
          {PUBLIC_LINKS.map((link) => (
            <Link
              key={link.label}
              href={`${basePath}${link.href}`}
              className="text-muted-foreground hover:text-foreground w-fit text-sm transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href={`${basePath}/donate`}
            className="text-muted-foreground hover:text-foreground w-fit text-sm transition-colors"
          >
            Donate
          </Link>
          <Link
            href={`${basePath}/volunteer`}
            className="text-muted-foreground hover:text-foreground w-fit text-sm transition-colors"
          >
            Volunteer
          </Link>
        </nav>
      </div>
    </div>
  );
}
