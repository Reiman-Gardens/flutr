"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type InstitutionDetail = {
  id: number;
  slug: string;
  name: string;
  street_address: string;
  extended_address: string | null;
  city: string;
  state_province: string;
  postal_code: string;
  country: string;
  phone_number: string | null;
  email_address: string | null;
  website_url: string | null;
  logo_url: string | null;
  facility_image_url: string | null;
  theme_colors: string[] | null;
  time_zone: string | null;
  iabes_member: boolean;
  stats_active: boolean;
  description: string | null;
};

type ApiErrorDetail = {
  path?: string;
  message?: string;
};

const usTimeZones = [
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

function isHexColor(value: string | null | undefined) {
  if (!value) return false;
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

export default function PlatformInstitutionProfilePage() {
  const params = useParams<{ id: string }>();
  const institutionId = params?.id ?? "";

  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [extendedAddress, setExtendedAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateProvince, setStateProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");

  const [phoneNumber, setPhoneNumber] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");

  const [logoUrl, setLogoUrl] = useState("");
  const [facilityImageUrl, setFacilityImageUrl] = useState("");
  const [themeColorsEnabled, setThemeColorsEnabled] = useState(false);
  const [primaryColor, setPrimaryColor] = useState("#2563eb");
  const [secondaryColor, setSecondaryColor] = useState("#16a34a");
  const [accentColor, setAccentColor] = useState("#f97316");

  const [timeZone, setTimeZone] = useState("");
  const [iabesMember, setIabesMember] = useState(false);
  const [statsActive, setStatsActive] = useState(false);
  const [description, setDescription] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setLoadError(null);
      setSuccessMessage(null);
      setFieldErrors({});

      try {
        const response = await fetch(`/api/institution/${institutionId}`, { cache: "no-store" });
        const body = (await response.json().catch(() => null)) as
          | InstitutionDetail
          | { error?: string }
          | null;

        if (!response.ok || !body || typeof body !== "object" || !("id" in body)) {
          setLoadError(
            (body as { error?: string } | null)?.error ?? "Unable to load institution profile.",
          );
          return;
        }

        const institution = body as InstitutionDetail;
        setSlug(institution.slug ?? "");
        setName(institution.name ?? "");
        setStreetAddress(institution.street_address ?? "");
        setExtendedAddress(institution.extended_address ?? "");
        setCity(institution.city ?? "");
        setStateProvince(institution.state_province ?? "");
        setPostalCode(institution.postal_code ?? "");
        setCountry(institution.country ?? "");

        setPhoneNumber(institution.phone_number ?? "");
        setEmailAddress(institution.email_address ?? "");
        setWebsiteUrl(institution.website_url ?? "");

        setLogoUrl(institution.logo_url ?? "");
        setFacilityImageUrl(institution.facility_image_url ?? "");

        const themeColors = Array.isArray(institution.theme_colors) ? institution.theme_colors : [];
        setThemeColorsEnabled(themeColors.length > 0);
        setPrimaryColor(isHexColor(themeColors[0]) ? themeColors[0] : "#2563eb");
        setSecondaryColor(isHexColor(themeColors[1]) ? themeColors[1] : "#16a34a");
        setAccentColor(isHexColor(themeColors[2]) ? themeColors[2] : "#f97316");

        setTimeZone(institution.time_zone ?? "");
        setIabesMember(Boolean(institution.iabes_member));
        setStatsActive(Boolean(institution.stats_active));
        setDescription(institution.description ?? "");
      } catch {
        setLoadError("Unable to load institution profile.");
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [institutionId]);

  const navHrefs = useMemo(() => {
    return {
      overview: `/platform/institutions/${institutionId}`,
      profile: `/platform/institutions/${institutionId}/profile`,
      users: `/platform/institutions/${institutionId}/users`,
      data: `/platform/institutions/${institutionId}/data`,
      tenantAdmin: slug ? `/${slug}/dashboard` : "/",
    };
  }, [institutionId, slug]);

  const getFieldError = (field: string) => fieldErrors[field]?.[0] ?? null;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    setSuccessMessage(null);
    setFieldErrors({});

    const themeColors = themeColorsEnabled ? [primaryColor, secondaryColor, accentColor] : [];

    const payload = {
      name: name.trim(),
      slug: slug.trim(),
      street_address: streetAddress.trim(),
      extended_address: extendedAddress.trim() || null,
      city: city.trim(),
      state_province: stateProvince.trim(),
      postal_code: postalCode.trim(),
      country: country.trim(),
      phone_number: phoneNumber.trim() || null,
      email_address: emailAddress.trim() || null,
      website_url: websiteUrl.trim() || null,
      logo_url: logoUrl.trim() || null,
      facility_image_url: facilityImageUrl.trim() || null,
      theme_colors: themeColors,
      time_zone: timeZone.trim() || null,
      iabes_member: iabesMember,
      stats_active: statsActive,
      description: description.trim() || null,
    };

    try {
      const response = await fetch(`/api/institution/${institutionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = (await response.json().catch(() => null)) as {
        error?: string;
        details?: ApiErrorDetail[];
      } | null;

      if (!response.ok) {
        if (
          response.status === 400 &&
          body?.error === "Invalid request" &&
          Array.isArray(body.details)
        ) {
          const nextFieldErrors: Record<string, string[]> = {};

          body.details.forEach((detail) => {
            const path = detail.path && detail.path.length > 0 ? detail.path : "form";
            if (!nextFieldErrors[path]) {
              nextFieldErrors[path] = [];
            }
            nextFieldErrors[path].push(detail.message ?? "Invalid value");
          });

          setFieldErrors(nextFieldErrors);
          setSaveError("Please correct the highlighted fields.");
          return;
        }

        setSaveError(body?.error ?? "Unable to update institution profile.");
        return;
      }

      setSuccessMessage("Institution profile updated successfully.");
    } catch {
      setSaveError("Unable to update institution profile.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
        <p className="text-sm" role="status" aria-live="polite">
          Loading institution profile...
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
        <p className="text-destructive text-sm" role="status" aria-live="polite">
          {loadError}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Institution Profile</h1>
        <p className="text-muted-foreground text-sm">Institution ID: {institutionId}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline">
          <Link href={navHrefs.overview}>Overview</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href={navHrefs.profile}>Profile</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={navHrefs.users}>Users</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={navHrefs.data}>Data</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={navHrefs.tenantAdmin}>Open Tenant Admin View</Link>
        </Button>
      </div>

      <form className="space-y-6" onSubmit={onSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                name="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
              {getFieldError("name") ? (
                <p className="text-destructive text-sm">{getFieldError("name")}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                name="slug"
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                required
              />
              {getFieldError("slug") ? (
                <p className="text-destructive text-sm">{getFieldError("slug")}</p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Address</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="street_address">Street Address *</Label>
              <Input
                id="street_address"
                name="street_address"
                value={streetAddress}
                onChange={(event) => setStreetAddress(event.target.value)}
                required
              />
              {getFieldError("street_address") ? (
                <p className="text-destructive text-sm">{getFieldError("street_address")}</p>
              ) : null}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="extended_address">
                Extended Address <span className="text-muted-foreground text-xs">(Optional)</span>
              </Label>
              <Input
                id="extended_address"
                name="extended_address"
                value={extendedAddress}
                onChange={(event) => setExtendedAddress(event.target.value)}
              />
              {getFieldError("extended_address") ? (
                <p className="text-destructive text-sm">{getFieldError("extended_address")}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                name="city"
                value={city}
                onChange={(event) => setCity(event.target.value)}
                required
              />
              {getFieldError("city") ? (
                <p className="text-destructive text-sm">{getFieldError("city")}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="state_province">State/Province *</Label>
              <Input
                id="state_province"
                name="state_province"
                value={stateProvince}
                onChange={(event) => setStateProvince(event.target.value)}
                required
              />
              {getFieldError("state_province") ? (
                <p className="text-destructive text-sm">{getFieldError("state_province")}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="postal_code">Postal Code *</Label>
              <Input
                id="postal_code"
                name="postal_code"
                value={postalCode}
                onChange={(event) => setPostalCode(event.target.value)}
                required
              />
              {getFieldError("postal_code") ? (
                <p className="text-destructive text-sm">{getFieldError("postal_code")}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country *</Label>
              <Input
                id="country"
                name="country"
                value={country}
                onChange={(event) => setCountry(event.target.value)}
                required
              />
              {getFieldError("country") ? (
                <p className="text-destructive text-sm">{getFieldError("country")}</p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone_number">
                Phone Number <span className="text-muted-foreground text-xs">(Optional)</span>
              </Label>
              <Input
                id="phone_number"
                name="phone_number"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
              />
              {getFieldError("phone_number") ? (
                <p className="text-destructive text-sm">{getFieldError("phone_number")}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email_address">
                Email Address <span className="text-muted-foreground text-xs">(Optional)</span>
              </Label>
              <Input
                id="email_address"
                name="email_address"
                type="email"
                value={emailAddress}
                onChange={(event) => setEmailAddress(event.target.value)}
              />
              {getFieldError("email_address") ? (
                <p className="text-destructive text-sm">{getFieldError("email_address")}</p>
              ) : null}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="website_url">
                Website URL <span className="text-muted-foreground text-xs">(Optional)</span>
              </Label>
              <Input
                id="website_url"
                name="website_url"
                value={websiteUrl}
                onChange={(event) => setWebsiteUrl(event.target.value)}
              />
              {getFieldError("website_url") ? (
                <p className="text-destructive text-sm">{getFieldError("website_url")}</p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Branding</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="logo_url">
                Logo URL <span className="text-muted-foreground text-xs">(Optional)</span>
              </Label>
              <Input
                id="logo_url"
                name="logo_url"
                value={logoUrl}
                onChange={(event) => setLogoUrl(event.target.value)}
              />
              {getFieldError("logo_url") ? (
                <p className="text-destructive text-sm">{getFieldError("logo_url")}</p>
              ) : null}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="facility_image_url">
                Facility Image URL <span className="text-muted-foreground text-xs">(Optional)</span>
              </Label>
              <Input
                id="facility_image_url"
                name="facility_image_url"
                value={facilityImageUrl}
                onChange={(event) => setFacilityImageUrl(event.target.value)}
              />
              {getFieldError("facility_image_url") ? (
                <p className="text-destructive text-sm">{getFieldError("facility_image_url")}</p>
              ) : null}
            </div>

            <div className="flex items-center gap-2 md:col-span-2">
              <Checkbox
                id="theme_colors_enabled"
                checked={themeColorsEnabled}
                onCheckedChange={(checked) => setThemeColorsEnabled(Boolean(checked))}
              />
              <Label htmlFor="theme_colors_enabled">
                Enable Theme Colors{" "}
                <span className="text-muted-foreground text-xs">(Optional)</span>
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="primary_color">Primary</Label>
              <Input
                id="primary_color"
                name="primary_color"
                type="color"
                value={primaryColor}
                onChange={(event) => setPrimaryColor(event.target.value)}
                disabled={!themeColorsEnabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondary_color">Secondary</Label>
              <Input
                id="secondary_color"
                name="secondary_color"
                type="color"
                value={secondaryColor}
                onChange={(event) => setSecondaryColor(event.target.value)}
                disabled={!themeColorsEnabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accent_color">Accent</Label>
              <Input
                id="accent_color"
                name="accent_color"
                type="color"
                value={accentColor}
                onChange={(event) => setAccentColor(event.target.value)}
                disabled={!themeColorsEnabled}
              />
            </div>

            {getFieldError("theme_colors") ? (
              <p className="text-destructive text-sm md:col-span-2">
                {getFieldError("theme_colors")}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Metadata</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
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
                {usTimeZones.map((zone) => (
                  <option key={zone.code} value={zone.code}>
                    {zone.label} ({zone.code}) – {getCurrentTimeForZone(zone.iana)}
                  </option>
                ))}
              </select>
              {getFieldError("time_zone") ? (
                <p className="text-destructive text-sm">{getFieldError("time_zone")}</p>
              ) : null}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="iabes_member"
                  checked={iabesMember}
                  onCheckedChange={(checked) => setIabesMember(Boolean(checked))}
                />
                <Label htmlFor="iabes_member">IABES Member</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="stats_active"
                  checked={statsActive}
                  onCheckedChange={(checked) => setStatsActive(Boolean(checked))}
                />
                <Label htmlFor="stats_active">Stats Active</Label>
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">
                Description <span className="text-muted-foreground text-xs">(Optional)</span>
              </Label>
              <Textarea
                id="description"
                name="description"
                rows={5}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
              {getFieldError("description") ? (
                <p className="text-destructive text-sm">{getFieldError("description")}</p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {saveError ? (
          <p className="text-destructive text-sm" role="status" aria-live="polite">
            {saveError}
          </p>
        ) : null}
        {fieldErrors.form?.length ? (
          <ul
            className="text-destructive list-disc space-y-1 pl-5 text-sm"
            role="status"
            aria-live="polite"
          >
            {fieldErrors.form.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        ) : null}
        {successMessage ? (
          <p className="text-sm text-green-600" role="status" aria-live="polite">
            {successMessage}
          </p>
        ) : null}

        <div className="flex justify-end">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Profile"}
          </Button>
        </div>
      </form>
    </div>
  );
}
