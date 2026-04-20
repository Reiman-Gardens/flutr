import { Link } from "@/components/ui/link";
import { Globe, Mail, Phone } from "lucide-react";
import { useInstitution } from "@/hooks/use-institution";
import { resolveInstitutionInvolvementLinks } from "@/lib/institution-links";
import { PUBLIC_LINKS } from "@/components/nav/nav-links";
import { SOCIAL_ICONS } from "@/lib/social-icons";
import type { PublicInstitution } from "@/types/institution";

export function InstitutionFooter({ institution }: { institution: PublicInstitution }) {
  const { basePath } = useInstitution();
  const { donationUrl, volunteerUrl, hasDonationUrl, hasVolunteerUrl } =
    resolveInstitutionInvolvementLinks(institution);

  const activeSocials = SOCIAL_ICONS.filter((s) => {
    const url = institution.social_links?.[s.key];
    return url && /^https?:\/\//i.test(url);
  });

  return (
    <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
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
          {institution.website_url && (
            <a
              href={institution.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground flex items-center gap-2 transition-colors"
            >
              <Globe className="size-4" aria-hidden="true" />
              {institution.website_url.replace(/^https?:\/\/(www\.)?/, "")}
              <span className="sr-only">(opens in new tab)</span>
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
        <nav aria-label="Explore links" className="flex flex-col gap-2">
          {PUBLIC_LINKS.map((link) => (
            <Link
              key={link.label}
              href={`${basePath}${link.href}`}
              className="text-muted-foreground hover:text-foreground w-fit text-sm transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Column 3: Get Involved */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Get Involved</h3>
        <nav aria-label="Get involved links" className="flex flex-col gap-2">
          {hasDonationUrl && (
            <a
              href={donationUrl ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground w-fit text-sm transition-colors"
            >
              Donate
              <span className="sr-only"> (opens in new tab)</span>
            </a>
          )}
          {hasVolunteerUrl && (
            <a
              href={volunteerUrl ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground w-fit text-sm transition-colors"
            >
              Volunteer
              <span className="sr-only"> (opens in new tab)</span>
            </a>
          )}
          <Link
            href={`${basePath}/contact`}
            className="text-muted-foreground hover:text-foreground w-fit text-sm transition-colors"
          >
            Contact
          </Link>
        </nav>
      </div>

      {/* Column 4: About Flutr */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">About Flutr</h3>
        <nav aria-label="About Flutr links" className="flex flex-col gap-2">
          <Link
            href="/contact"
            className="text-muted-foreground hover:text-foreground w-fit text-sm transition-colors"
          >
            Contact
          </Link>
          <Link
            href="/privacy"
            className="text-muted-foreground hover:text-foreground w-fit text-sm transition-colors"
          >
            Privacy Policy
          </Link>
        </nav>
      </div>
    </div>
  );
}
