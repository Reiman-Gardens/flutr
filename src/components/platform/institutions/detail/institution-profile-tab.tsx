"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { institutionSlugSchema } from "@/lib/validation/slug";
import { pickInstitutionUrlFields } from "@/lib/institution-form-url-fields";

import type { InstitutionDetail, InstitutionDetailMode } from "./institution-detail-shell";

const profileFormSchema = z.object({
  // Identity
  name: z.string().min(1, "Name is required"),
  slug: institutionSlugSchema,
  description: z.string().optional(),

  // Address
  street_address: z.string().min(1, "Street address is required"),
  extended_address: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state_province: z.string().min(1, "State / Province is required"),
  postal_code: z.string().min(1, "Postal code is required"),
  country: z.string().min(1, "Country is required"),
  time_zone: z.string().optional(),

  // Contact
  email_address: z.string().email("Invalid email address").or(z.literal("")).optional(),
  phone_number: z.string().optional(),
  website_url: z.string().url("Invalid URL").or(z.literal("")).optional(),
  volunteer_url: z.string().url("Invalid URL").or(z.literal("")).optional(),
  donation_url: z.string().url("Invalid URL").or(z.literal("")).optional(),

  // Social links (stored as individual fields, serialised on submit)
  social_twitter: z.string().optional(),
  social_instagram: z.string().optional(),
  social_facebook: z.string().optional(),
  social_linkedin: z.string().optional(),
  social_youtube: z.string().optional(),

  // Platform flags
  stats_active: z.boolean(),
  iabes_member: z.boolean(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface Props {
  institution: InstitutionDetail;
  onSaved: (institution: InstitutionDetail) => void;
  /** @default "platform" */
  mode?: InstitutionDetailMode;
  readOnly?: boolean;
}

type ProfileUpdateResponse = {
  institution?: Partial<InstitutionDetail> & {
    social_links?: Record<string, string> | null;
    theme_colors?: string[] | null;
  };
};

export default function InstitutionProfileTab({
  institution,
  onSaved,
  mode = "platform",
  readOnly = false,
}: Props) {
  const isTenant = mode === "tenant";
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      name: institution.name,
      slug: institution.slug,
      description: institution.description ?? "",
      street_address: institution.street_address,
      extended_address: institution.extended_address ?? "",
      city: institution.city,
      state_province: institution.state_province,
      postal_code: institution.postal_code,
      country: institution.country,
      time_zone: institution.time_zone ?? "",
      email_address: institution.email_address ?? "",
      phone_number: institution.phone_number ?? "",
      website_url: institution.website_url ?? "",
      volunteer_url: institution.volunteer_url ?? "",
      donation_url: institution.donation_url ?? "",
      social_twitter: institution.social_links?.twitter ?? "",
      social_instagram: institution.social_links?.instagram ?? "",
      social_facebook: institution.social_links?.facebook ?? "",
      social_linkedin: institution.social_links?.linkedin ?? "",
      social_youtube: institution.social_links?.youtube ?? "",
      stats_active: institution.stats_active,
      iabes_member: institution.iabes_member,
    },
  });

  useEffect(() => {
    form.reset({
      name: institution.name,
      slug: institution.slug,
      description: institution.description ?? "",
      street_address: institution.street_address,
      extended_address: institution.extended_address ?? "",
      city: institution.city,
      state_province: institution.state_province,
      postal_code: institution.postal_code,
      country: institution.country,
      time_zone: institution.time_zone ?? "",
      email_address: institution.email_address ?? "",
      phone_number: institution.phone_number ?? "",
      website_url: institution.website_url ?? "",
      volunteer_url: institution.volunteer_url ?? "",
      donation_url: institution.donation_url ?? "",
      social_twitter: institution.social_links?.twitter ?? "",
      social_instagram: institution.social_links?.instagram ?? "",
      social_facebook: institution.social_links?.facebook ?? "",
      social_linkedin: institution.social_links?.linkedin ?? "",
      social_youtube: institution.social_links?.youtube ?? "",
      stats_active: institution.stats_active,
      iabes_member: institution.iabes_member,
    });
  }, [institution, form]);

  const slugValue = form.watch("slug");

  async function onSubmit(values: ProfileFormValues) {
    const socialLinks: Record<string, string> = {};
    const urlFields = pickInstitutionUrlFields(
      {
        volunteer_url: values.volunteer_url,
        donation_url: values.donation_url,
      },
      { blankAsNull: true },
    );

    if (values.social_twitter) socialLinks.twitter = values.social_twitter;
    if (values.social_instagram) socialLinks.instagram = values.social_instagram;
    if (values.social_facebook) socialLinks.facebook = values.social_facebook;
    if (values.social_linkedin) socialLinks.linkedin = values.social_linkedin;
    if (values.social_youtube) socialLinks.youtube = values.social_youtube;

    const body = {
      name: values.name,
      ...(!isTenant ? { slug: values.slug } : {}),
      ...(values.description ? { description: values.description } : {}),
      street_address: values.street_address,
      ...(values.extended_address ? { extended_address: values.extended_address } : {}),
      city: values.city,
      state_province: values.state_province,
      postal_code: values.postal_code,
      country: values.country,
      ...(values.time_zone ? { time_zone: values.time_zone } : {}),
      ...(values.email_address ? { email_address: values.email_address } : {}),
      ...(values.phone_number ? { phone_number: values.phone_number } : {}),
      ...(values.website_url ? { website_url: values.website_url } : {}),
      ...urlFields,
      social_links: socialLinks,
      ...(!isTenant
        ? { stats_active: values.stats_active, iabes_member: values.iabes_member }
        : {}),
    };

    const [url, headers]: [string, Record<string, string>] = isTenant
      ? [
          "/api/tenant/institution",
          { "Content-Type": "application/json", "x-tenant-slug": institution.slug },
        ]
      : [`/api/platform/institutions/${institution.id}`, { "Content-Type": "application/json" }];

    const res = await fetch(url, {
      method: "PATCH",
      headers,
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = (await res.json().catch(() => ({}))) as ProfileUpdateResponse;
      const updatedInstitution = data.institution
        ? {
            ...institution,
            ...data.institution,
            social_links: data.institution.social_links ?? null,
            theme_colors: data.institution.theme_colors ?? institution.theme_colors,
          }
        : institution;

      onSaved(updatedInstitution);
      toast.success("Institution updated.");
    } else {
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) {
        form.setError("slug", { message: "Slug is already in use." });
      } else {
        toast.error(data.message ?? "Failed to update institution.");
      }
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 flex flex-col gap-8">
        <fieldset disabled={readOnly} className="flex flex-col gap-8">
          {readOnly && (
            <p className="text-muted-foreground text-sm">
              Only administrators can edit institution profile settings.
            </p>
          )}
          {/* Identity */}
          <section className="flex flex-col gap-4">
            <h2 className="text-sm font-semibold">Identity</h2>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Butterfly Haven" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isTenant && (
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input placeholder="butterfly-haven" {...field} />
                    </FormControl>
                    <FormDescription>flutr.app/{slugValue || "…"}/gallery</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="A brief description of the institution…"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          <Separator />

          {/* Address */}
          <section className="flex flex-col gap-4">
            <h2 className="text-sm font-semibold">Address</h2>

            <FormField
              control={form.control}
              name="street_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street address</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Meadow Lane" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="extended_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Extended address{" "}
                    <span className="text-muted-foreground font-normal">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Suite 200" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="Springfield" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="state_province"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State / Province</FormLabel>
                    <FormControl>
                      <Input placeholder="IL" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="postal_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postal code</FormLabel>
                    <FormControl>
                      <Input placeholder="62701" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input placeholder="United States" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="time_zone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Time zone <span className="text-muted-foreground font-normal">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="America/Chicago" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          <Separator />

          {/* Contact */}
          <section className="flex flex-col gap-4" data-onboarding="org-info">
            <h2 className="text-sm font-semibold">Contact</h2>

            <FormField
              control={form.control}
              name="email_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Email address{" "}
                    <span className="text-muted-foreground font-normal">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="hello@butterfly-haven.org" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Phone number{" "}
                    <span className="text-muted-foreground font-normal">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="+1 (555) 000-0000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="website_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Website URL{" "}
                    <span className="text-muted-foreground font-normal">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input type="url" placeholder="https://butterfly-haven.org" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="volunteer_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Volunteer URL{" "}
                    <span className="text-muted-foreground font-normal">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input type="url" placeholder="https://example.org/volunteer" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="donation_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Donation URL{" "}
                    <span className="text-muted-foreground font-normal">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input type="url" placeholder="https://example.org/donate" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          <Separator />

          {/* News Management */}
          <section className="flex flex-col gap-4" data-onboarding="news-section">
            <h2 className="text-sm font-semibold">Institution News</h2>
            <p className="text-muted-foreground text-sm">
              Publish updates and announcements that appear on your public-facing pages to keep
              visitors engaged with your conservation efforts and facility news.
            </p>
            <Button variant="outline" className="w-fit" disabled>
              Manage News (Coming Soon)
            </Button>
          </section>

          <Separator />

          {/* Social Links */}
          <section className="flex flex-col gap-4" data-onboarding="social-links">
            <h2 className="text-sm font-semibold">Social Links</h2>

            {(
              [
                { name: "social_twitter", label: "Twitter / X" },
                { name: "social_instagram", label: "Instagram" },
                { name: "social_facebook", label: "Facebook" },
                { name: "social_linkedin", label: "LinkedIn" },
                { name: "social_youtube", label: "YouTube" },
              ] as const
            ).map(({ name, label }) => (
              <FormField
                key={name}
                control={form.control}
                name={name}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {label} <span className="text-muted-foreground font-normal">(optional)</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="url" placeholder="https://" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </section>

          {!isTenant && (
            <>
              <Separator />

              {/* Platform Flags */}
              <section className="flex flex-col gap-4">
                <h2 className="text-sm font-semibold">Platform Flags</h2>

                <FormField
                  control={form.control}
                  name="stats_active"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel>Active on public stats</FormLabel>
                        <FormDescription>
                          Show this institution on the public statistics page
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="iabes_member"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3 rounded-lg border p-4">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-0.5">
                        <FormLabel>IABES member</FormLabel>
                        <FormDescription>This institution is a member of IABES</FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </section>
            </>
          )}
        </fieldset>

        {!readOnly && (
          <div className="flex justify-end">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving…" : "Save changes"}
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}
