"use client";

import { useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { RotateCcw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { ROUTES } from "@/lib/routes";

import { MAX_LIFESPAN_DAYS } from "@/lib/validation/species";

import type { SpeciesOverrideValues, TenantSpeciesSummary } from "./species.utils";

/**
 * Client mirror of `updateSpeciesOverrideBodySchema`. Both fields are optional here —
 * an empty input means "use the shared catalog value", which is sent as an explicit null.
 */
const overrideFormSchema = z.object({
  common_name: z.string().max(200, "Common name must be 200 characters or less"),
  lifespan: z
    .string()
    .refine((value) => value.trim() === "" || /^\d+$/.test(value.trim()), {
      message: "Lifespan must be a whole number of days",
    })
    .refine(
      (value) => {
        const trimmed = value.trim();
        if (trimmed === "") return true;
        const parsed = Number(trimmed);
        return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= MAX_LIFESPAN_DAYS;
      },
      { message: `Lifespan must be between 1 and ${MAX_LIFESPAN_DAYS} days` },
    ),
});

type OverrideFormValues = z.infer<typeof overrideFormSchema>;

function toFormValues(species: TenantSpeciesSummary): OverrideFormValues {
  return {
    common_name: species.commonNameOverride?.trim() ?? "",
    lifespan:
      species.lifespanOverride !== null && species.lifespanOverride > 0
        ? String(species.lifespanOverride)
        : "",
  };
}

interface TenantSpeciesEditDialogProps {
  species: TenantSpeciesSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (speciesId: number, values: SpeciesOverrideValues) => void;
}

export default function TenantSpeciesEditDialog({
  species,
  open,
  onOpenChange,
  onSaved,
}: TenantSpeciesEditDialogProps) {
  const params = useParams<{ institution: string }>();
  const slug = params?.institution ?? "";
  const tenantHeaders = useMemo(() => ({ "x-tenant-slug": slug }), [slug]);

  const form = useForm<OverrideFormValues>({
    resolver: zodResolver(overrideFormSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: { common_name: "", lifespan: "" },
  });

  const initialValues = species ? toFormValues(species) : { common_name: "", lifespan: "" };

  useEffect(() => {
    if (open && species) {
      form.reset(toFormValues(species));
    }
  }, [open, species, form]);

  const watchedCommonName = form.watch("common_name");
  const watchedLifespan = form.watch("lifespan");

  const hasChanges =
    watchedCommonName.trim() !== initialValues.common_name ||
    watchedLifespan.trim() !== initialValues.lifespan;

  if (!species) {
    return null;
  }

  async function onSubmit(values: OverrideFormValues) {
    if (!species) return;

    // Send only what changed. `upsertSpeciesOverride` distinguishes an absent key
    // (leave as-is) from an explicit null (clear the override).
    const trimmedName = values.common_name.trim();
    const trimmedLifespan = values.lifespan.trim();

    const body: Record<string, string | number | null> = {};
    if (trimmedName !== initialValues.common_name) {
      body.common_name_override = trimmedName === "" ? null : trimmedName;
    }
    if (trimmedLifespan !== initialValues.lifespan) {
      body.lifespan_override = trimmedLifespan === "" ? null : Number(trimmedLifespan);
    }

    if (Object.keys(body).length === 0) {
      onOpenChange(false);
      return;
    }

    try {
      const res = await fetch(ROUTES.tenant.speciesOverrideApi(species.id), {
        method: "PATCH",
        headers: { ...tenantHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        toast.error(data?.error?.message ?? "Failed to save changes.");
        return;
      }

      const override = data?.override as
        | { commonNameOverride: string | null; lifespanOverride: number | null }
        | undefined;

      onSaved(species.id, {
        commonNameOverride: override?.commonNameOverride ?? null,
        lifespanOverride: override?.lifespanOverride ?? null,
      });
      toast.success(`Updated ${species.scientificName}.`);
      onOpenChange(false);
    } catch {
      toast.error("Failed to save changes.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="italic">{species.scientificName}</DialogTitle>
          <DialogDescription>
            Customize how this species appears for your institution. Leave a field empty to use the
            shared catalog value.
          </DialogDescription>
        </DialogHeader>

        {species.isLinked ? null : (
          <div
            role="status"
            className="border-input bg-muted/50 text-muted-foreground flex items-start gap-2 rounded-lg border p-3 text-sm"
          >
            <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <p>
              Your institution has not received this species yet. Saving a change will add it to
              your public gallery.
            </p>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="common_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Common name</FormLabel>
                  <div className="flex items-start gap-2">
                    <FormControl>
                      <Input placeholder={species.commonName} {...field} />
                    </FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      aria-label="Reset common name to the shared catalog value"
                      disabled={field.value.trim() === ""}
                      onClick={() =>
                        form.setValue("common_name", "", {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                    >
                      <RotateCcw aria-hidden="true" className="size-4" />
                      Reset
                    </Button>
                  </div>
                  <FormDescription>Shared catalog value: {species.commonName}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lifespan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lifespan (days)</FormLabel>
                  <div className="flex items-start gap-2">
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={MAX_LIFESPAN_DAYS}
                        step={1}
                        placeholder={String(species.lifespanDays)}
                        {...field}
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      aria-label="Reset lifespan to the shared catalog value"
                      disabled={field.value.trim() === ""}
                      onClick={() =>
                        form.setValue("lifespan", "", { shouldDirty: true, shouldValidate: true })
                      }
                    >
                      <RotateCcw aria-hidden="true" className="size-4" />
                      Reset
                    </Button>
                  </div>
                  <FormDescription>
                    Shared catalog value: {species.lifespanDays} days. This also decides how long a
                    released butterfly counts as in flight.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={form.formState.isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting || !hasChanges}>
                {form.formState.isSubmitting ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
