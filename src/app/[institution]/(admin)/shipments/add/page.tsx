"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useParams } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createShipmentSchema } from "@/lib/validation/shipments";
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

type ShipmentFormValues = z.input<typeof createShipmentSchema>;

const toLocalInputValue = (isoValue: string) => {
  if (!isoValue) return "";
  const date = new Date(isoValue);
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

const defaultItem = {
  butterflySpeciesId: 0,
  numberReceived: 0,
  emergedInTransit: 0,
  damagedInTransit: 0,
  diseasedInTransit: 0,
  parasite: 0,
  nonEmergence: 0,
  poorEmergence: 0,
};

export default function AddShipmentPage() {
  const params = useParams<{ institution: string }>();
  const institutionSlug = params?.institution ?? "";

  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [institutionId, setInstitutionId] = useState<number | null>(null);
  const [supplierOptions, setSupplierOptions] = useState<
    { id: number; name: string; code: string; isActive: boolean }[]
  >([]);
  const [suppliersStatus, setSuppliersStatus] = useState<"idle" | "loading" | "error">("idle");

  const defaultValues = useMemo(
    () => ({
      supplierCode: "",
      shipmentDate: "",
      arrivalDate: "",
      items: [{ ...defaultItem }],
    }),
    [],
  );

  const form = useForm<ShipmentFormValues>({
    resolver: zodResolver(createShipmentSchema),
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

  const onSubmit = async (values: ShipmentFormValues) => {
    setServerError(null);
    setSuccessMessage(null);

    if (!institutionId) {
      setServerError("Unable to determine institution");
      return;
    }

    const payload = {
      ...values,
      institutionId,
      items: values.items.map((item) => ({
        ...item,
        emergedInTransit: item.emergedInTransit ?? 0,
        damagedInTransit: item.damagedInTransit ?? 0,
        diseasedInTransit: item.diseasedInTransit ?? 0,
        parasite: item.parasite ?? 0,
        nonEmergence: item.nonEmergence ?? 0,
        poorEmergence: item.poorEmergence ?? 0,
      })),
    };

    try {
      const response = await fetch("/api/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setServerError(result?.error ?? "Unable to create shipment");
        return;
      }

      form.reset(defaultValues);
      setSuccessMessage("Shipment created successfully.");
    } catch {
      setServerError("Unable to create shipment");
    }
  };

  useEffect(() => {
    const loadInstitution = async () => {
      if (!institutionSlug) {
        setInstitutionId(null);
        return;
      }

      try {
        const response = await fetch(`/api/public/institutions/${institutionSlug}`);
        const result = await response.json().catch(() => null);

        if (!response.ok || !result || typeof result.id !== "number") {
          setInstitutionId(null);
          return;
        }

        setInstitutionId(result.id);
      } catch {
        setInstitutionId(null);
      }
    };

    void loadInstitution();
  }, [institutionSlug]);

  useEffect(() => {
    const loadSuppliers = async () => {
      setSuppliersStatus("loading");
      try {
        const response = await fetch("/api/suppliers");
        const result = await response.json().catch(() => null);

        if (!response.ok) {
          setSuppliersStatus("error");
          return;
        }

        const options = Array.isArray(result)
          ? result
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
  }, []);

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
                  name="supplierCode"
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
                  name="shipmentDate"
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
                  name="arrivalDate"
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
                  {fields.map((field, index) => (
                    <div key={field.id} className="rounded-lg border p-4">
                      <div className="grid gap-4 md:grid-cols-4">
                        <FormField
                          control={form.control}
                          name={`items.${index}.butterflySpeciesId`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Species ID</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={1}
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
                          name={`items.${index}.numberReceived`}
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
                          name={`items.${index}.emergedInTransit`}
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
                          name={`items.${index}.damagedInTransit`}
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
                          name={`items.${index}.diseasedInTransit`}
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
                          name={`items.${index}.nonEmergence`}
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
                          name={`items.${index}.poorEmergence`}
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
                          onClick={() => remove(index)}
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
              <Button type="button" variant="outline" onClick={() => form.reset(defaultValues)}>
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
