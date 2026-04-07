"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useParams } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createShipmentBodySchema } from "@/lib/validation/shipments";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

type ShipmentFormValues = z.input<typeof createShipmentBodySchema>;

type ApiErrorBody = {
  error?: {
    message?: string;
  };
  message?: string;
};

type SpeciesOption = {
  id: number;
  scientificName: string;
  commonName: string;
};

const getApiErrorMessage = (payload: unknown, fallback: string) => {
  const body = payload as ApiErrorBody | null;
  return body?.error?.message ?? body?.message ?? fallback;
};

const toLocalInputValue = (value: unknown) => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.valueOf())) return "";

  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
};

const toIsoString = (localValue: string) => {
  if (!localValue) return "";
  const date = new Date(localValue);
  if (Number.isNaN(date.valueOf())) return localValue;
  return date.toISOString();
};

const getSpeciesLabel = (option: SpeciesOption) => {
  return `${option.scientificName} — ${option.commonName}`;
};

const defaultItem = {
  butterfly_species_id: 0,
  number_received: 0,
  emerged_in_transit: 0,
  damaged_in_transit: 0,
  diseased_in_transit: 0,
  parasite: 0,
  non_emergence: 0,
  poor_emergence: 0,
};

export default function AddShipmentPage() {
  const params = useParams<{ institution: string }>();
  const rawInstitutionSlug = params?.institution ?? "";
  const institutionSlug = Array.isArray(rawInstitutionSlug)
    ? (rawInstitutionSlug[0] ?? "")
    : rawInstitutionSlug;

  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [supplierOptions, setSupplierOptions] = useState<
    { id: number; name: string; code: string; isActive: boolean }[]
  >([]);
  const [suppliersStatus, setSuppliersStatus] = useState<"idle" | "loading" | "error">("idle");
  const [speciesOptions, setSpeciesOptions] = useState<SpeciesOption[]>([]);
  const [speciesStatus, setSpeciesStatus] = useState<"idle" | "loading" | "error">("idle");
  const [speciesSearchByRowId, setSpeciesSearchByRowId] = useState<Record<string, string>>({});
  const [activeSpeciesRowId, setActiveSpeciesRowId] = useState<string | null>(null);

  const tenantHeaders = useMemo(() => ({ "x-tenant-slug": institutionSlug }), [institutionSlug]);

  const defaultValues = useMemo(
    () => ({
      supplier_code: "",
      shipment_date: "",
      arrival_date: "",
      items: [{ ...defaultItem }],
    }),
    [],
  );

  const form = useForm<ShipmentFormValues>({
    resolver: zodResolver(createShipmentBodySchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const handleNumberChange = (onChange: (value: number) => void) => {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const next = Number(event.target.value);
      onChange(Number.isNaN(next) ? 0 : next);
    };
  };

  const getFilteredSpeciesOptions = (searchTerm: string) => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) return speciesOptions;

    return speciesOptions.filter((option) => {
      return (
        option.scientificName.toLowerCase().includes(normalized) ||
        option.commonName.toLowerCase().includes(normalized)
      );
    });
  };

  const onSubmit = async (values: ShipmentFormValues) => {
    setServerError(null);
    setSuccessMessage(null);

    if (!institutionSlug) {
      setServerError("Missing institution slug");
      return;
    }

    const payload = {
      ...values,
      items: values.items.map((item) => ({
        ...item,
        emerged_in_transit: item.emerged_in_transit ?? 0,
        damaged_in_transit: item.damaged_in_transit ?? 0,
        diseased_in_transit: item.diseased_in_transit ?? 0,
        parasite: item.parasite ?? 0,
        non_emergence: item.non_emergence ?? 0,
        poor_emergence: item.poor_emergence ?? 0,
      })),
    };

    try {
      const response = await fetch("/api/tenant/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...tenantHeaders },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setServerError(getApiErrorMessage(result, "Unable to create shipment"));
        return;
      }

      form.reset(defaultValues);
      setSpeciesSearchByRowId({});
      setActiveSpeciesRowId(null);
      setSuccessMessage("Shipment created successfully.");
    } catch {
      setServerError("Unable to create shipment");
    }
  };

  useEffect(() => {
    const loadSuppliers = async () => {
      if (!institutionSlug) {
        setSuppliersStatus("error");
        return;
      }

      setSuppliersStatus("loading");
      try {
        const response = await fetch("/api/tenant/suppliers", {
          headers: tenantHeaders,
        });
        const result = await response.json().catch(() => null);

        if (!response.ok) {
          setSuppliersStatus("error");
          return;
        }

        const rows =
          result && typeof result === "object" && "suppliers" in result ? result.suppliers : null;

        const options = Array.isArray(rows)
          ? rows
              .filter((item) => item && typeof item.code === "string")
              .map((item) => ({
                id: item.id,
                name: item.name ?? item.code,
                code: item.code,
                isActive: item.isActive ?? true,
              }))
          : [];

        setSupplierOptions(options);
        setSuppliersStatus("idle");
      } catch {
        setSuppliersStatus("error");
      }
    };

    void loadSuppliers();
  }, [institutionSlug, tenantHeaders]);

  useEffect(() => {
    const loadSpecies = async () => {
      if (!institutionSlug) {
        setSpeciesStatus("error");
        return;
      }

      setSpeciesStatus("loading");

      try {
        const response = await fetch("/api/tenant/species", {
          headers: tenantHeaders,
        });
        const result = await response.json().catch(() => null);

        if (!response.ok) {
          setSpeciesStatus("error");
          return;
        }

        const rows =
          result && typeof result === "object" && "species" in result ? result.species : null;

        const options = Array.isArray(rows)
          ? rows
              .map((row) => {
                if (!row || typeof row !== "object") return null;

                const id = typeof row.id === "number" ? row.id : Number(row.id);
                const scientificName =
                  typeof row.scientificName === "string" ? row.scientificName.trim() : "";
                const commonNameOverride =
                  typeof row.commonNameOverride === "string" ? row.commonNameOverride.trim() : "";
                const commonNameBase =
                  typeof row.commonName === "string" ? row.commonName.trim() : "";
                const commonName = commonNameOverride || commonNameBase || scientificName;

                if (!Number.isFinite(id) || id <= 0 || !scientificName) return null;

                return {
                  id,
                  scientificName,
                  commonName,
                } satisfies SpeciesOption;
              })
              .filter((option): option is SpeciesOption => option !== null)
          : [];

        setSpeciesOptions(options);
        setSpeciesStatus("idle");
      } catch {
        setSpeciesStatus("error");
      }
    };

    void loadSpecies();
  }, [institutionSlug, tenantHeaders]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Add shipment</h1>
        <p className="text-muted-foreground">
          Record shipment details and quality metrics for each species in the delivery.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Shipment details</CardTitle>
          <CardDescription>Provide the shipment header and line items.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="supplier_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier code</FormLabel>
                      <FormControl>
                        <NativeSelect
                          value={field.value}
                          onChange={field.onChange}
                          aria-label="Select supplier"
                        >
                          <NativeSelectOption value="">
                            {suppliersStatus === "loading"
                              ? "Loading suppliers..."
                              : "Select a supplier"}
                          </NativeSelectOption>
                          {supplierOptions.map((supplier) => (
                            <NativeSelectOption key={supplier.id} value={supplier.code}>
                              {supplier.code} — {supplier.name}
                              {supplier.isActive ? "" : " (inactive)"}
                            </NativeSelectOption>
                          ))}
                        </NativeSelect>
                      </FormControl>
                      <FormDescription>Use the USDA supplier abbreviation.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="shipment_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shipment date</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          value={toLocalInputValue(field.value)}
                          onChange={(event) => field.onChange(toIsoString(event.target.value))}
                        />
                      </FormControl>
                      <FormDescription>When the shipment left the supplier.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="arrival_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Arrival date</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          value={toLocalInputValue(field.value)}
                          onChange={(event) => field.onChange(toIsoString(event.target.value))}
                        />
                      </FormControl>
                      <FormDescription>When the shipment arrived on-site.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Shipment items</h2>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => append({ ...defaultItem })}
                  >
                    Add item
                  </Button>
                </div>

                <div className="space-y-4">
                  {fields.map((itemField, index) => (
                    <div key={itemField.id} className="rounded-lg border p-4">
                      <div className="grid gap-4 md:grid-cols-4">
                        <FormField
                          control={form.control}
                          name={`items.${index}.butterfly_species_id`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Species</FormLabel>
                              <FormControl>
                                <div className="relative space-y-2">
                                  <Input
                                    type="text"
                                    value={speciesSearchByRowId[itemField.id] ?? ""}
                                    placeholder="Type scientific or common name"
                                    role="combobox"
                                    aria-expanded={activeSpeciesRowId === itemField.id}
                                    aria-controls={`species-options-${itemField.id}`}
                                    aria-autocomplete="list"
                                    onFocus={() => setActiveSpeciesRowId(itemField.id)}
                                    onBlur={() => {
                                      window.setTimeout(() => {
                                        setActiveSpeciesRowId((current) =>
                                          current === itemField.id ? null : current,
                                        );
                                      }, 120);
                                    }}
                                    onChange={(event) => {
                                      field.onChange(0);
                                      setActiveSpeciesRowId(itemField.id);
                                      setSpeciesSearchByRowId((prev) => ({
                                        ...prev,
                                        [itemField.id]: event.target.value,
                                      }));
                                    }}
                                  />

                                  {activeSpeciesRowId === itemField.id && (
                                    <div
                                      id={`species-options-${itemField.id}`}
                                      role="listbox"
                                      className="bg-background absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border shadow-md"
                                    >
                                      {speciesStatus === "loading" && (
                                        <div className="px-3 py-2 text-sm">Loading species...</div>
                                      )}

                                      {speciesStatus === "error" && (
                                        <div className="px-3 py-2 text-sm">
                                          Unable to load species options.
                                        </div>
                                      )}

                                      {speciesStatus === "idle" &&
                                        (() => {
                                          const filtered = getFilteredSpeciesOptions(
                                            speciesSearchByRowId[itemField.id] ?? "",
                                          );

                                          if (filtered.length === 0) {
                                            return (
                                              <div className="px-3 py-2 text-sm">
                                                No species matches your filter.
                                              </div>
                                            );
                                          }

                                          return filtered.map((option) => (
                                            <button
                                              type="button"
                                              key={option.id}
                                              role="option"
                                              aria-selected={field.value === option.id}
                                              className="hover:bg-muted block w-full px-3 py-2 text-left"
                                              onMouseDown={(event) => event.preventDefault()}
                                              onClick={() => {
                                                field.onChange(option.id);
                                                setSpeciesSearchByRowId((prev) => ({
                                                  ...prev,
                                                  [itemField.id]: getSpeciesLabel(option),
                                                }));
                                                setActiveSpeciesRowId(null);
                                              }}
                                            >
                                              <div className="text-sm font-medium">
                                                {option.scientificName}
                                              </div>
                                              <div className="text-muted-foreground text-xs">
                                                {option.commonName}
                                              </div>
                                            </button>
                                          ));
                                        })()}
                                    </div>
                                  )}
                                </div>
                              </FormControl>
                              <FormDescription>
                                Type to filter by scientific or common name.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`items.${index}.number_received`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Received</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  step={1}
                                  value={field.value}
                                  onChange={handleNumberChange(field.onChange)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`items.${index}.emerged_in_transit`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Emerged</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  step={1}
                                  value={field.value}
                                  onChange={handleNumberChange(field.onChange)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`items.${index}.damaged_in_transit`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Damaged</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  step={1}
                                  value={field.value}
                                  onChange={handleNumberChange(field.onChange)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`items.${index}.diseased_in_transit`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Diseased</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  step={1}
                                  value={field.value}
                                  onChange={handleNumberChange(field.onChange)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`items.${index}.parasite`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Parasite</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  step={1}
                                  value={field.value}
                                  onChange={handleNumberChange(field.onChange)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`items.${index}.non_emergence`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Non-emergence</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  step={1}
                                  value={field.value}
                                  onChange={handleNumberChange(field.onChange)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`items.${index}.poor_emergence`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Poor emergence</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  step={1}
                                  value={field.value}
                                  onChange={handleNumberChange(field.onChange)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="mt-4 flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            remove(index);
                            setSpeciesSearchByRowId((prev) => {
                              const next = { ...prev };
                              delete next[itemField.id];
                              return next;
                            });
                            setActiveSpeciesRowId((current) =>
                              current === itemField.id ? null : current,
                            );
                          }}
                          disabled={fields.length === 1}
                        >
                          Remove item
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {(serverError || successMessage) && (
                <div
                  className="rounded-md border px-4 py-3 text-sm"
                  role="status"
                  aria-live="polite"
                >
                  {serverError ? (
                    <span className="text-destructive">{serverError}</span>
                  ) : (
                    <span className="text-emerald-600">{successMessage}</span>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter className="justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset(defaultValues);
                  setSpeciesSearchByRowId({});
                  setActiveSpeciesRowId(null);
                }}
              >
                Reset
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : "Save shipment"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
