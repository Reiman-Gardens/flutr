"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";

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
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

import {
  formatRangeInput,
  normalizePlatformSpecies,
  parseRangeInput,
  type PlatformSpeciesRecord,
} from "./species.utils";

const speciesFormSchema = z.object({
  scientific_name: z.string().min(1, "Scientific name is required").max(200),
  common_name: z.string().min(1, "Common name is required").max(200),
  family: z.string().min(1, "Family is required").max(200),
  sub_family: z.string().min(1, "Sub-family is required").max(200),
  lifespan_days: z.coerce.number().int().positive("Lifespan must be greater than 0"),
  range_text: z.string().refine((value) => parseRangeInput(value).length > 0, {
    message: "Add at least one region or country",
  }),
  description: z.string().max(5000).optional(),
  host_plant: z.string().max(500).optional(),
  habitat: z.string().max(500).optional(),
  fun_facts: z.string().max(5000).optional(),
  img_wings_open: z.string().url("Enter a valid URL").or(z.literal("")),
  img_wings_closed: z.string().url("Enter a valid URL").or(z.literal("")),
  extra_img_1: z.string().url("Enter a valid URL").or(z.literal("")),
  extra_img_2: z.string().url("Enter a valid URL").or(z.literal("")),
});

type SpeciesFormInput = z.input<typeof speciesFormSchema>;
type SpeciesFormOutput = z.output<typeof speciesFormSchema>;

type ApiErrorResponse = {
  error?: {
    message?: string;
  };
};

interface SpeciesFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  speciesId: number | null;
  onSaved: (species: PlatformSpeciesRecord, mode: "create" | "edit") => void;
}

const defaultValues: SpeciesFormInput = {
  scientific_name: "",
  common_name: "",
  family: "",
  sub_family: "",
  lifespan_days: 14,
  range_text: "",
  description: "",
  host_plant: "",
  habitat: "",
  fun_facts: "",
  img_wings_open: "",
  img_wings_closed: "",
  extra_img_1: "",
  extra_img_2: "",
};

export default function SpeciesFormDialog({
  open,
  onOpenChange,
  speciesId,
  onSaved,
}: SpeciesFormDialogProps) {
  const isEdit = speciesId !== null;
  const [isLoadingSpecies, setIsLoadingSpecies] = useState(false);

  const form = useForm<SpeciesFormInput, undefined, SpeciesFormOutput>({
    resolver: zodResolver(speciesFormSchema),
    mode: "onBlur",
    defaultValues,
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!speciesId) {
      form.reset(defaultValues);
      return;
    }

    let cancelled = false;

    void (async () => {
      setIsLoadingSpecies(true);
      const response = await fetch(`/api/platform/species/${speciesId}`);

      if (cancelled) {
        return;
      }

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => ({}))) as ApiErrorResponse;
        toast.error(readApiErrorMessage(errorBody) || "Unable to load species details.");
        onOpenChange(false);
        setIsLoadingSpecies(false);
        return;
      }

      const data = (await response.json()) as {
        species: {
          id: number;
          scientific_name: string;
          common_name: string;
          family: string;
          sub_family: string;
          lifespan_days: number;
          range: string[];
          description: string | null;
          host_plant: string | null;
          habitat: string | null;
          fun_facts: string | null;
          img_wings_open: string | null;
          img_wings_closed: string | null;
          extra_img_1: string | null;
          extra_img_2: string | null;
          created_at: string;
          updated_at: string;
        };
      };

      form.reset({
        scientific_name: data.species.scientific_name,
        common_name: data.species.common_name,
        family: data.species.family,
        sub_family: data.species.sub_family,
        lifespan_days: data.species.lifespan_days,
        range_text: formatRangeInput(data.species.range),
        description: data.species.description ?? "",
        host_plant: data.species.host_plant ?? "",
        habitat: data.species.habitat ?? "",
        fun_facts: data.species.fun_facts ?? "",
        img_wings_open: data.species.img_wings_open ?? "",
        img_wings_closed: data.species.img_wings_closed ?? "",
        extra_img_1: data.species.extra_img_1 ?? "",
        extra_img_2: data.species.extra_img_2 ?? "",
      });
      setIsLoadingSpecies(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [form, onOpenChange, open, speciesId]);

  async function onSubmit(values: SpeciesFormOutput) {
    const payload = {
      scientific_name: values.scientific_name,
      common_name: values.common_name,
      family: values.family,
      sub_family: values.sub_family,
      lifespan_days: values.lifespan_days,
      range: parseRangeInput(values.range_text),
      ...(values.description?.trim() ? { description: values.description } : {}),
      ...(values.host_plant?.trim() ? { host_plant: values.host_plant } : {}),
      ...(values.habitat?.trim() ? { habitat: values.habitat } : {}),
      ...(values.fun_facts?.trim() ? { fun_facts: values.fun_facts } : {}),
      ...(values.img_wings_open ? { img_wings_open: values.img_wings_open } : {}),
      ...(values.img_wings_closed ? { img_wings_closed: values.img_wings_closed } : {}),
      ...(values.extra_img_1 ? { extra_img_1: values.extra_img_1 } : {}),
      ...(values.extra_img_2 ? { extra_img_2: values.extra_img_2 } : {}),
    };

    const response = await fetch(
      isEdit ? `/api/platform/species/${speciesId}` : "/api/platform/species",
      {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => ({}))) as ApiErrorResponse;

      if (response.status === 409) {
        form.setError("scientific_name", {
          message: "Scientific name already exists in the catalog.",
        });
        return;
      }

      toast.error(
        readApiErrorMessage(errorBody) ||
          `Unable to ${isEdit ? "update" : "create"} butterfly species.`,
      );
      return;
    }

    const data = (await response.json()) as {
      species: {
        id: number;
        scientific_name: string;
        common_name: string;
        family: string;
        sub_family: string;
        lifespan_days: number;
        range: string[];
        description: string | null;
        host_plant: string | null;
        habitat: string | null;
        fun_facts: string | null;
        img_wings_open: string | null;
        img_wings_closed: string | null;
        extra_img_1: string | null;
        extra_img_2: string | null;
        created_at: string;
        updated_at: string;
      };
    };

    onSaved(normalizePlatformSpecies(data.species), isEdit ? "edit" : "create");
    toast.success(isEdit ? "Species updated." : "Species created.");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Butterfly Species" : "Add Butterfly Species"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the master species record used across the platform."
              : "Create a new master species record for all institutions."}
          </DialogDescription>
        </DialogHeader>

        {isLoadingSpecies ? (
          <div className="flex min-h-48 items-center justify-center gap-3">
            <Spinner className="size-4" />
            <p className="text-muted-foreground text-sm">Loading species details...</p>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="common_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Common name</FormLabel>
                      <FormControl>
                        <Input placeholder="Blue Morpho" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="scientific_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scientific name</FormLabel>
                      <FormControl>
                        <Input placeholder="Morpho peleides" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="family"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Family</FormLabel>
                      <FormControl>
                        <Input placeholder="Nymphalidae" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sub_family"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sub-family</FormLabel>
                      <FormControl>
                        <Input placeholder="Morphinae" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lifespan_days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lifespan (days)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          inputMode="numeric"
                          name={field.name}
                          ref={field.ref}
                          onBlur={field.onBlur}
                          value={typeof field.value === "number" ? field.value : ""}
                          onChange={(event) => field.onChange(event.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="range_text"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Range</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={"North America\nCentral America"}
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Enter one region or country per line. Commas are also supported.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="host_plant"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Host plant</FormLabel>
                      <FormControl>
                        <Input placeholder="Willow" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="habitat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Habitat</FormLabel>
                      <FormControl>
                        <Input placeholder="Tropical forest edges" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Overview of the species..." rows={5} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fun_facts"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fun facts</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Unique details for educators and guests..."
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="img_wings_open"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wings open image URL</FormLabel>
                      <FormControl>
                        <Input type="url" placeholder="https://example.com/open.jpg" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="img_wings_closed"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wings closed image URL</FormLabel>
                      <FormControl>
                        <Input type="url" placeholder="https://example.com/closed.jpg" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="extra_img_1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Extra image URL 1</FormLabel>
                      <FormControl>
                        <Input
                          type="url"
                          placeholder="https://example.com/detail-1.jpg"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="extra_img_2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Extra image URL 2</FormLabel>
                      <FormControl>
                        <Input
                          type="url"
                          placeholder="https://example.com/detail-2.jpg"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting || isLoadingSpecies}>
                  {form.formState.isSubmitting
                    ? isEdit
                      ? "Saving..."
                      : "Creating..."
                    : isEdit
                      ? "Save changes"
                      : "Create species"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function readApiErrorMessage(body: ApiErrorResponse) {
  return body.error?.message ?? "";
}
