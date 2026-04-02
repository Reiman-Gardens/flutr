"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

import type { InstitutionDetail } from "./institution-detail-shell";

const PRESET_COLORS: { hex: string; label: string }[] = [
  { hex: "#0d9488", label: "Teal" },
  { hex: "#16a34a", label: "Green" },
  { hex: "#4f46e5", label: "Indigo" },
  { hex: "#ea580c", label: "Orange" },
  { hex: "#e11d48", label: "Rose" },
  { hex: "#475569", label: "Slate" },
  { hex: "#d97706", label: "Amber" },
  { hex: "#7c3aed", label: "Violet" },
];

const HEX_REGEX = /^#[0-9a-fA-F]{6}$/;

const themeFormSchema = z.object({
  primary_color: z.string().regex(HEX_REGEX, "Must be a valid hex color (#rrggbb)"),
  logo_url: z.string().url("Invalid URL").or(z.literal("")).optional(),
  facility_image_url: z.string().url("Invalid URL").or(z.literal("")).optional(),
});

type ThemeFormValues = z.infer<typeof themeFormSchema>;

interface Props {
  institution: InstitutionDetail;
}

export default function InstitutionThemeTab({ institution }: Props) {
  const initialColor = institution.theme_colors?.[0] ?? PRESET_COLORS[0].hex;

  const [isCustom, setIsCustom] = useState(!PRESET_COLORS.some((c) => c.hex === initialColor));
  const [logoPreview, setLogoPreview] = useState(institution.logo_url ?? "");
  const [facilityPreview, setFacilityPreview] = useState(institution.facility_image_url ?? "");

  const form = useForm<ThemeFormValues>({
    resolver: zodResolver(themeFormSchema),
    defaultValues: {
      primary_color: initialColor,
      logo_url: institution.logo_url ?? "",
      facility_image_url: institution.facility_image_url ?? "",
    },
  });

  const primaryColor = form.watch("primary_color");

  function selectPreset(color: string) {
    setIsCustom(false);
    form.setValue("primary_color", color, { shouldValidate: true });
  }

  function selectCustom() {
    setIsCustom(true);
  }

  async function onSubmit(values: ThemeFormValues) {
    const body = {
      theme_colors: [values.primary_color],
      ...(values.logo_url ? { logo_url: values.logo_url } : {}),
      ...(values.facility_image_url ? { facility_image_url: values.facility_image_url } : {}),
    };

    const res = await fetch(`/api/platform/institutions/${institution.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      toast.success("Theme updated.");
    } else {
      toast.error("Failed to update theme.");
    }
  }

  const isValidHex = HEX_REGEX.test(primaryColor);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 flex flex-col gap-8">
        {/* Theme Colors */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold">Primary Color</h2>
            <div
              className="size-5 rounded-full border"
              style={{ backgroundColor: isValidHex ? primaryColor : undefined }}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            {PRESET_COLORS.map(({ hex, label }) => (
              <button
                key={hex}
                type="button"
                aria-label={label}
                aria-pressed={!isCustom && primaryColor === hex}
                onClick={() => selectPreset(hex)}
                className={cn(
                  "size-8 rounded-full border-2 transition-all",
                  !isCustom && primaryColor === hex
                    ? "border-foreground ring-2 ring-offset-2"
                    : "hover:border-muted-foreground/40 border-transparent",
                )}
                style={{ backgroundColor: hex }}
              />
            ))}

            {/* Custom */}
            <button
              type="button"
              aria-label="Custom color"
              aria-pressed={isCustom}
              onClick={selectCustom}
              className={cn(
                "flex size-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-all",
                isCustom
                  ? "border-foreground bg-muted ring-2 ring-offset-2"
                  : "border-muted-foreground/40 hover:border-muted-foreground/60 bg-muted/50 border-dashed",
              )}
            >
              +
            </button>
          </div>

          {isCustom && (
            <FormField
              control={form.control}
              name="primary_color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Custom hex color</FormLabel>
                  <FormControl>
                    <Input placeholder="#4f46e5" maxLength={7} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </section>

        <Separator />

        {/* Media */}
        <section className="flex flex-col gap-6">
          <h2 className="text-sm font-semibold">Media</h2>

          {/* Logo URL */}
          <div className="flex flex-col gap-3">
            <FormField
              control={form.control}
              name="logo_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Logo URL <span className="text-muted-foreground font-normal">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://example.com/logo.png"
                      {...field}
                      onBlur={(e) => {
                        field.onBlur();
                        setLogoPreview(e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {logoPreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoPreview}
                alt="Logo preview"
                className="h-16 w-auto rounded border object-contain"
                onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                onLoad={(e) => ((e.target as HTMLImageElement).style.display = "")}
              />
            )}
          </div>

          {/* Facility image URL */}
          <div className="flex flex-col gap-3">
            <FormField
              control={form.control}
              name="facility_image_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Facility image URL{" "}
                    <span className="text-muted-foreground font-normal">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://example.com/facility.jpg"
                      {...field}
                      onBlur={(e) => {
                        field.onBlur();
                        setFacilityPreview(e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {facilityPreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={facilityPreview}
                alt="Facility image preview"
                className="h-32 w-full rounded border object-cover"
                onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                onLoad={(e) => ((e.target as HTMLImageElement).style.display = "")}
              />
            )}
          </div>
        </section>

        <div className="flex justify-end">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
