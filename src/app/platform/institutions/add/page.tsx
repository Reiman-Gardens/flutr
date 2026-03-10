"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ValidationDetail = {
  path?: string;
  message?: string;
};

const stateProvinceOptions = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
  "Ontario",
  "Quebec",
  "British Columbia",
  "Alberta",
  "Manitoba",
  "Saskatchewan",
  "Baja California",
  "Jalisco",
  "Nuevo Leon",
  "Yucatan",
  "England",
  "Scotland",
  "Wales",
  "Northern Ireland",
  "New South Wales",
  "Victoria",
  "Queensland",
  "Auckland",
];

const countryOptions = [
  "United States",
  "Canada",
  "Mexico",
  "United Kingdom",
  "Ireland",
  "Germany",
  "France",
  "Spain",
  "Italy",
  "Netherlands",
  "Belgium",
  "Switzerland",
  "Australia",
  "New Zealand",
  "Japan",
  "South Korea",
  "India",
  "Brazil",
  "Argentina",
  "Colombia",
  "South Africa",
  "Singapore",
  "United Arab Emirates",
];

const timezoneOptions = [
  { label: "Eastern", code: "EST", iana: "America/New_York" },
  { label: "Central", code: "CST", iana: "America/Chicago" },
  { label: "Mountain", code: "MST", iana: "America/Denver" },
  { label: "Pacific", code: "PST", iana: "America/Los_Angeles" },
  { label: "Alaska", code: "AKST", iana: "America/Anchorage" },
  { label: "Hawaii", code: "HST", iana: "Pacific/Honolulu" },
];

function getCurrentTimeForZone(ianaTimeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: ianaTimeZone,
  }).format(new Date());
}

export default function AddInstitutionPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateProvince, setStateProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");
  const [timeZone, setTimeZone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationMessages, setValidationMessages] = useState<string[]>([]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setValidationMessages([]);

    const payload = {
      name: name.trim(),
      slug: slug.trim(),
      street_address: streetAddress.trim(),
      city: city.trim(),
      state_province: stateProvince.trim(),
      postal_code: postalCode.trim(),
      country: country.trim(),
      time_zone: timeZone.trim() || null,
    };

    try {
      const response = await fetch("/api/institution/list", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const body = (await response.json().catch(() => null)) as {
        error?: string;
        details?: ValidationDetail[];
      } | null;

      if (!response.ok) {
        if (response.status === 400 && body?.error === "Slug already in use") {
          setErrorMessage("Slug already in use. Please choose a different slug.");
          return;
        }

        if (response.status === 400 && body?.error === "Invalid request" && body.details) {
          const messages = body.details
            .map((detail) => detail.message)
            .filter((message): message is string => Boolean(message));

          setErrorMessage("Please fix the highlighted validation issues.");
          setValidationMessages(messages);
          return;
        }

        setErrorMessage(body?.error ?? "Unable to create institution.");
        return;
      }

      router.push("/platform/institutions");
      router.refresh();
    } catch {
      setErrorMessage("Unable to create institution.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">Add Institution</h1>
          <p className="text-muted-foreground text-sm">
            Create a new institution for platform API testing.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/platform/institutions">Back to institutions</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Institution details</CardTitle>
          <CardDescription>Enter required institution metadata for API testing.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                name="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="off"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                name="slug"
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                autoComplete="off"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="street_address">Street Address *</Label>
              <Input
                id="street_address"
                name="street_address"
                value={streetAddress}
                onChange={(event) => setStreetAddress(event.target.value)}
                autoComplete="street-address"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                name="city"
                value={city}
                onChange={(event) => setCity(event.target.value)}
                autoComplete="address-level2"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state_province">State/Province *</Label>
              <Input
                id="state_province"
                name="state_province"
                list="states"
                value={stateProvince}
                onChange={(event) => setStateProvince(event.target.value)}
                autoComplete="address-level1"
                required
              />
              <datalist id="states">
                {stateProvinceOptions.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </div>

            <div className="space-y-2">
              <Label htmlFor="postal_code">Postal Code *</Label>
              <Input
                id="postal_code"
                name="postal_code"
                value={postalCode}
                onChange={(event) => setPostalCode(event.target.value)}
                autoComplete="postal-code"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country *</Label>
              <Input
                id="country"
                name="country"
                list="countries"
                value={country}
                onChange={(event) => setCountry(event.target.value)}
                autoComplete="country-name"
                required
              />
              <datalist id="countries">
                {countryOptions.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time_zone">
                Time Zone <span className="text-muted-foreground text-xs">(Optional)</span>
              </Label>
              <select
                id="time_zone"
                name="time_zone"
                value={timeZone}
                onChange={(event) => setTimeZone(event.target.value)}
                className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring h-9 w-full rounded-md border px-3 py-1 text-base shadow-xs focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
              >
                <option value="">Select a time zone</option>
                {timezoneOptions.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label} ({option.code}) – {getCurrentTimeForZone(option.iana)}
                  </option>
                ))}
              </select>
            </div>

            {errorMessage ? (
              <div className="text-destructive text-sm" role="status" aria-live="polite">
                {errorMessage}
              </div>
            ) : null}

            {validationMessages.length > 0 ? (
              <ul
                className="text-destructive list-disc space-y-1 pl-5 text-sm"
                role="status"
                aria-live="polite"
              >
                {validationMessages.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            ) : null}

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Institution"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
