import type { Metadata } from "next";
import { Mail, Phone, MapPin, Globe, Heart, HandHelping, ExternalLink } from "lucide-react";

import { getPublicInstitution } from "@/lib/queries/institution";
import { SOCIAL_ICONS } from "@/lib/social-icons";
import type { PublicInstitution } from "@/types/institution";

interface ContactPageProps {
  params: Promise<{ institution: string }>;
}

export async function generateMetadata({ params }: ContactPageProps): Promise<Metadata> {
  const { institution: slug } = await params;
  const inst = await getPublicInstitution(slug);
  return {
    title: inst ? `Contact — ${inst.name}` : "Contact",
  };
}

export default async function ContactPage({ params }: ContactPageProps) {
  const { institution: slug } = await params;
  const inst = (await getPublicInstitution(slug))!;

  const socials = inst.social_links as PublicInstitution["social_links"];
  const activeSocials = SOCIAL_ICONS.filter((s) => {
    const url = socials?.[s.key];
    return url && /^https?:\/\//i.test(url);
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Contact Us</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          We&apos;d love to hear from you. Reach out with questions, plan a visit, or learn how to
          get involved.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Contact information card */}
        <section
          aria-labelledby="contact-heading"
          className="bg-card order-1 rounded-2xl border p-6 shadow-sm"
        >
          <h2 id="contact-heading" className="text-foreground mb-4 text-xl font-semibold">
            Get in Touch
          </h2>

          <div className="space-y-4">
            {/* Address */}
            <div className="flex items-start gap-3">
              <MapPin className="text-muted-foreground mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <address className="text-sm leading-relaxed not-italic">
                <p className="font-medium">{inst.name}</p>
                <p className="text-muted-foreground">{inst.street_address}</p>
                {inst.extended_address && (
                  <p className="text-muted-foreground">{inst.extended_address}</p>
                )}
                <p className="text-muted-foreground">
                  {inst.city}, {inst.state_province} {inst.postal_code}
                </p>
                <p className="text-muted-foreground">{inst.country}</p>
              </address>
            </div>

            {/* Email */}
            {inst.email_address && (
              <div className="flex items-center gap-3">
                <Mail className="text-muted-foreground size-5 shrink-0" aria-hidden="true" />
                <a
                  href={`mailto:${inst.email_address}`}
                  className="text-sm font-medium underline-offset-4 hover:underline"
                >
                  {inst.email_address}
                </a>
              </div>
            )}

            {/* Phone */}
            {inst.phone_number && (
              <div className="flex items-center gap-3">
                <Phone className="text-muted-foreground size-5 shrink-0" aria-hidden="true" />
                <a
                  href={`tel:${inst.phone_number}`}
                  className="text-sm font-medium underline-offset-4 hover:underline"
                >
                  {inst.phone_number}
                </a>
              </div>
            )}

            {/* Website */}
            {inst.website_url && (
              <div className="flex items-center gap-3">
                <Globe className="text-muted-foreground size-5 shrink-0" aria-hidden="true" />
                <a
                  href={inst.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
                >
                  {inst.website_url.replace(/^https?:\/\/(www\.)?/, "")}
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                  <span className="sr-only">(opens in new tab)</span>
                </a>
              </div>
            )}

            {/* Social links */}
            {activeSocials.length > 0 && (
              <div className="border-t pt-4">
                <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
                  Follow Us
                </p>
                <div className="flex items-center gap-3">
                  {activeSocials.map((social) => {
                    const Icon = social.icon;
                    const url = socials![social.key]!;
                    return (
                      <a
                        key={social.key}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground rounded-lg border p-2.5 transition-colors"
                        aria-label={`${social.label} (opens in new tab)`}
                      >
                        <Icon className="size-5" aria-hidden="true" />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Donations card */}
        <section
          id="donate"
          aria-labelledby="donate-heading"
          className="bg-card order-3 rounded-2xl border p-6 shadow-sm lg:order-2"
        >
          <div className="mb-4 flex items-center gap-2">
            <Heart className="text-muted-foreground size-5" aria-hidden="true" />
            <h2 id="donate-heading" className="text-foreground text-xl font-semibold">
              Support {inst.name}
            </h2>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Your generous donations help us care for our butterfly collection, fund conservation
            research, and maintain our educational programs. Every contribution makes a difference
            in preserving these remarkable species.
          </p>
          <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
            To make a donation or learn about sponsorship opportunities, please contact us
            {inst.email_address ? (
              <>
                {" "}
                at{" "}
                <a
                  href={`mailto:${inst.email_address}?subject=Donation Inquiry`}
                  className="text-foreground font-medium underline-offset-4 hover:underline"
                >
                  {inst.email_address}
                </a>
              </>
            ) : inst.phone_number ? (
              <>
                {" "}
                at{" "}
                <a
                  href={`tel:${inst.phone_number}`}
                  className="text-foreground font-medium underline-offset-4 hover:underline"
                >
                  {inst.phone_number}
                </a>
              </>
            ) : null}
            .
          </p>
        </section>

        {/* Volunteering card */}
        <section
          id="volunteer"
          aria-labelledby="volunteer-heading"
          className="bg-card order-2 rounded-2xl border p-6 shadow-sm lg:order-3 lg:col-span-2"
        >
          <div className="mb-4 flex items-center gap-2">
            <HandHelping className="text-muted-foreground size-5" aria-hidden="true" />
            <h2 id="volunteer-heading" className="text-foreground text-xl font-semibold">
              Volunteer With Us
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Volunteers are the heart of {inst.name}. Whether you&apos;re passionate about
                butterflies, conservation, or education, there are many ways to contribute your time
                and skills.
              </p>
              <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                Opportunities include guided tour support, butterfly garden maintenance, educational
                program assistance, and special event help.
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                To learn more about current volunteer opportunities or to sign up, please reach out
                to us
                {inst.email_address ? (
                  <>
                    {" "}
                    at{" "}
                    <a
                      href={`mailto:${inst.email_address}?subject=Volunteer Inquiry`}
                      className="text-foreground font-medium underline-offset-4 hover:underline"
                    >
                      {inst.email_address}
                    </a>
                  </>
                ) : inst.phone_number ? (
                  <>
                    {" "}
                    at{" "}
                    <a
                      href={`tel:${inst.phone_number}`}
                      className="text-foreground font-medium underline-offset-4 hover:underline"
                    >
                      {inst.phone_number}
                    </a>
                  </>
                ) : null}
                .
              </p>
              <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                No prior experience is necessary — just enthusiasm and a willingness to learn. We
                provide all training on-site.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
