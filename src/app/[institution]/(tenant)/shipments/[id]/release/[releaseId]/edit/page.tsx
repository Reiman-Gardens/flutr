"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { notFound, useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ROUTES } from "@/lib/routes";

import {
  ReleaseComposer,
  type ReleaseQuantities,
} from "@/components/tenant/releases/release-composer";
import type {
  ReleaseEventDetail,
  ShipmentDetailResponse,
} from "@/components/tenant/shipments/types";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
});

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "—";
  return dateFormatter.format(date);
}

export default function EditReleasePage() {
  const params = useParams<{ institution: string; id: string; releaseId: string }>();
  const router = useRouter();
  const slug = params?.institution ?? "";
  const shipmentId = Number(params?.id);
  const releaseId = Number(params?.releaseId);

  const [release, setRelease] = useState<ReleaseEventDetail | null>(null);
  const [shipment, setShipment] = useState<ShipmentDetailResponse | null>(null);
  const [values, setValues] = useState<ReleaseQuantities>({});
  const [originalValues, setOriginalValues] = useState<ReleaseQuantities>({});
  const [status, setStatus] = useState<"idle" | "loading" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const tenantHeaders = useMemo(() => ({ "x-tenant-slug": slug }), [slug]);
  const detailHref = ROUTES.tenant.shipmentById(slug, shipmentId);

  const handleGoBack = () => router.back();

  useEffect(() => {
    const ac = new AbortController();
    void (async () => {
      setStatus("loading");
      setErrorMessage(null);
      try {
        const releaseRes = await fetch(`/api/tenant/releases/${releaseId}`, {
          headers: tenantHeaders,
          signal: ac.signal,
        });
        const releaseJson = await releaseRes.json().catch(() => null);
        if (!releaseRes.ok) {
          setStatus("error");
          setErrorMessage(releaseJson?.error?.message ?? "Failed to load release.");
          return;
        }

        // Defensive: the release_event must belong to the shipment in the URL.
        // The API already enforces tenant scoping, but mismatched ids would be
        // a bug worth surfacing rather than silently editing the wrong row.
        if (releaseJson.event.shipmentId !== shipmentId) {
          setStatus("error");
          setErrorMessage("This release does not belong to that shipment.");
          return;
        }

        const shRes = await fetch(`/api/tenant/shipments/${shipmentId}`, {
          headers: tenantHeaders,
          signal: ac.signal,
        });
        const shJson = await shRes.json().catch(() => null);
        if (!shRes.ok) {
          setStatus("error");
          setErrorMessage(shJson?.error?.message ?? "Failed to load shipment.");
          return;
        }

        setRelease(releaseJson);
        setShipment(shJson);

        const initialValues: ReleaseQuantities = {};
        for (const item of releaseJson.items as ReleaseEventDetail["items"]) {
          initialValues[item.shipmentItemId] = item.quantity;
        }
        setValues(initialValues);
        setOriginalValues(initialValues);
        setStatus("idle");
      } catch (err) {
        if (ac.signal.aborted) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setStatus("error");
        setErrorMessage("Failed to load release.");
      }
    })();
    return () => ac.abort();
  }, [releaseId, shipmentId, tenantHeaders]);

  const handleChange = useCallback((itemId: number, quantity: number) => {
    setValues((current) => ({ ...current, [itemId]: quantity }));
  }, []);

  const total = useMemo(
    () => Object.values(values).reduce((acc, value) => acc + (value || 0), 0),
    [values],
  );

  const handleSave = async () => {
    if (!release) return;

    // The PATCH endpoint can only update existing in_flight rows; it cannot
    // add or remove species. Restrict to the original shipment_item_ids and
    // require quantity > 0 (positive integer per release validation).
    const items = release.items
      .map((row) => ({
        shipment_item_id: row.shipmentItemId,
        quantity: values[row.shipmentItemId] ?? 0,
      }))
      .filter((item) => item.quantity > 0);

    if (items.length !== release.items.length) {
      setErrorMessage(
        "Quantities must remain positive for every species in this release. To remove a species, delete and recreate the release.",
      );
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    try {
      const response = await fetch(`/api/tenant/releases/${releaseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...tenantHeaders },
        body: JSON.stringify({ items }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setErrorMessage(result?.error?.message ?? "Unable to update release.");
        return;
      }
      router.push(detailHref);
    } finally {
      setSaving(false);
    }
  };

  // Bad URL ids — bail to the nearest not-found boundary instead of rendering
  // a custom error state.
  if (
    !Number.isFinite(shipmentId) ||
    shipmentId <= 0 ||
    !Number.isFinite(releaseId) ||
    releaseId <= 0
  ) {
    notFound();
  }

  if (status === "loading") {
    return (
      <div className="text-muted-foreground" role="status" aria-live="polite" aria-busy="true">
        Loading release…
      </div>
    );
  }
  if (status === "error" || !release || !shipment) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-destructive">{errorMessage ?? "Release not available."}</p>
        <Button variant="outline" onClick={handleGoBack}>
          <ArrowLeft className="size-4" />
          Back
        </Button>
      </div>
    );
  }

  // Restrict the composer to the species that are part of this release so
  // users don't see species they cannot interact with via the PATCH API.
  const composerItems = shipment.items.filter((item) =>
    release.items.some((row) => row.shipmentItemId === item.id),
  );

  return (
    <div className="flex flex-col gap-6 pb-32">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2" onClick={handleGoBack}>
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <h1 className="text-3xl font-semibold">Edit release</h1>
        <p className="text-muted-foreground">
          {shipment.shipment.supplierCode} · Released {formatDate(release.event.releaseDate)} by{" "}
          {release.event.releasedBy}
        </p>
      </div>

      {errorMessage && (
        <div className="text-destructive text-sm" role="alert">
          {errorMessage}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Released butterflies</CardTitle>
          <CardDescription>
            Adjust the per-species counts. The release date and operator are read-only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReleaseComposer
            items={composerItems}
            values={values}
            onChange={handleChange}
            alreadyAllocated={originalValues}
          />
        </CardContent>
      </Card>

      <div className="bg-background sticky bottom-0 -mx-4 border-t px-4 py-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
          <div>
            <div className="text-muted-foreground text-xs uppercase">Total released</div>
            <div className="text-2xl font-semibold">{total}</div>
          </div>
          <Button size="lg" onClick={handleSave} disabled={saving || total === 0}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
