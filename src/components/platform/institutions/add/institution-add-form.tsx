"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { institutionSlugSchema } from "@/lib/validation/slug";

const TIMEZONE_OPTIONS = [
  // North America
  { label: "Eastern (ET) — America/New_York", iana: "America/New_York" },
  { label: "Central (CT) — America/Chicago", iana: "America/Chicago" },
  { label: "Mountain (MT) — America/Denver", iana: "America/Denver" },
  { label: "Pacific (PT) — America/Los_Angeles", iana: "America/Los_Angeles" },
  { label: "Alaska (AKT) — America/Anchorage", iana: "America/Anchorage" },
  { label: "Hawaii (HST) — Pacific/Honolulu", iana: "Pacific/Honolulu" },
  // Europe
  { label: "GMT — Europe/London", iana: "Europe/London" },
  { label: "CET — Europe/Paris", iana: "Europe/Paris" },
  { label: "EET — Europe/Helsinki", iana: "Europe/Helsinki" },
  // Oceania
  { label: "AEST — Australia/Sydney", iana: "Australia/Sydney" },
  { label: "NZST — Pacific/Auckland", iana: "Pacific/Auckland" },
  // Asia
  { label: "JST — Asia/Tokyo", iana: "Asia/Tokyo" },
  { label: "IST — Asia/Kolkata", iana: "Asia/Kolkata" },
  { label: "SGT — Asia/Singapore", iana: "Asia/Singapore" },
];

const addFormSchema = z.object({
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

  // Contact (all optional)
  email_address: z.string().email("Invalid email address").or(z.literal("")).optional(),
  phone_number: z.string().optional(),
  website_url: z.string().url("Invalid URL").or(z.literal("")).optional(),

  // Platform flags
  iabes_member: z.boolean(),
});

type AddFormValues = z.infer<typeof addFormSchema>;

export default function InstitutionAddForm() {
  const router = useRouter();

  const form = useForm<AddFormValues>({
    resolver: zodResolver(addFormSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      street_address: "",
      extended_address: "",
      city: "",
      state_province: "",
      postal_code: "",
      country: "",
      time_zone: "",
      email_address: "",
      phone_number: "",
      website_url: "",
      iabes_member: false,
    },
  });

  const slugValue = form.watch("slug");

  async function onSubmit(values: AddFormValues) {
    const body = {
      name: values.name,
      slug: values.slug,
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
      iabes_member: values.iabes_member,
    };

    const res = await fetch("/api/platform/institutions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      router.push(`/platform/institutions/${data.institution.id}?tab=profile`);
      return;
    }

    if (res.status === 409) {
      form.setError("slug", { message: "Slug is already in use." });
      return;
    }

    const data = await res.json().catch(() => ({}));
    toast.error(data?.error ?? "Unable to create institution.");
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-8">
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

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Description{" "}
                      <span className="text-muted-foreground font-normal">(optional)</span>
                    </FormLabel>
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
                      Time zone{" "}
                      <span className="text-muted-foreground font-normal">(optional)</span>
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger aria-label="Select time zone">
                          <SelectValue placeholder="Select a time zone" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TIMEZONE_OPTIONS.map((tz) => (
                          <SelectItem key={tz.iana} value={tz.iana}>
                            {tz.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </section>

            <Separator />

            {/* Contact */}
            <section className="flex flex-col gap-4">
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
            </section>

            <Separator />

            {/* Platform Flags */}
            <section className="flex flex-col gap-4">
              <h2 className="text-sm font-semibold">Platform Flags</h2>

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

            <div className="flex justify-end">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Creating…" : "Create Institution"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
