"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

type ShipmentHeader = {
  id: number;
  institutionId: number;
  supplierCode: string;
  shipmentDate: string;
  arrivalDate: string;
  createdAt: string;
};

type ShipmentItem = {
  id: number;
  butterflySpeciesId: number;
  scientificName: string;
  imageUrl: string | null;
  numberReceived: number;
  emergedInTransit: number;
  damagedInTransit: number;
  diseasedInTransit: number;
  parasite: number;
  nonEmergence: number;
  poorEmergence: number;
  inFlightQuantity: number;
};

type ShipmentDetailResponse = {
  shipment: ShipmentHeader;
  items: ShipmentItem[];
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "-";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const getAvailableToRelease = (item: ShipmentItem) => {
  const deadCount =
    item.damagedInTransit +
    item.diseasedInTransit +
    item.parasite +
    item.nonEmergence +
    item.poorEmergence;

  return Math.max(0, item.numberReceived - deadCount - item.inFlightQuantity);
};

const parseReleaseQuantity = (value: string | undefined) => {
  if (typeof value !== "string" || value.trim().length === 0) return 0;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
};

export default function ShipmentDetailPage() {
  const params = useParams<{ institution: string; id: string }>();
  const institution = params?.institution ?? "";
  const rawShipmentId = params?.id ?? "";
  const shipmentId = Array.isArray(rawShipmentId) ? rawShipmentId[0] : rawShipmentId;
  const shipmentIdNumber = Number(shipmentId);

  const [detail, setDetail] = useState<ShipmentDetailResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [releaseStatus, setReleaseStatus] = useState<"idle" | "saving" | "success" | "error">(
    "idle",
  );
  const [releaseMessage, setReleaseMessage] = useState<string | null>(null);
  const [releaseQuantities, setReleaseQuantities] = useState<Record<number, string>>({});

  const syncReleaseQuantities = useCallback(
    (items: ShipmentItem[], mode: "preserve" | "reset" = "preserve") => {
      setReleaseQuantities((current) => {
        const next: Record<number, string> = {};
        for (const item of items) {
          next[item.id] = mode === "reset" ? "0" : (current[item.id] ?? "0");
        }
        return next;
      });
    },
    [],
  );

  const updateMetric = useCallback(
    (
      itemId: number,
      field:
        | "numberReceived"
        | "emergedInTransit"
        | "damagedInTransit"
        | "diseasedInTransit"
        | "parasite"
        | "nonEmergence"
        | "poorEmergence",
      delta: number,
    ) => {
      setDetail((current) => {
        if (!current) return current;

        return {
          ...current,
          items: current.items.map((item) => {
            if (item.id !== itemId) return item;

            const nextValue = Math.max(0, item[field] + delta);
            return { ...item, [field]: nextValue };
          }),
        };
      });
    },
    [],
  );

  const backHref = useMemo(() => {
    if (!institution) return "/shipments";
    return `/${institution}/shipments`;
  }, [institution]);

  const fetchDetail = useCallback(async () => {
    if (!shipmentId) {
      return { ok: false as const, error: "Invalid shipment id" };
    }

    if (!Number.isInteger(shipmentIdNumber) || shipmentIdNumber <= 0) {
      return { ok: false as const, error: "Invalid shipment id" };
    }

    try {
      const response = await fetch(`/api/shipments/${shipmentIdNumber}`);
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        return {
          ok: false as const,
          error: (result?.error as string | undefined) ?? "Unable to load shipment",
        };
      }

      return { ok: true as const, data: result as ShipmentDetailResponse };
    } catch {
      return { ok: false as const, error: "Unable to load shipment" };
    }
  }, [shipmentId, shipmentIdNumber]);

  const loadDetail = useCallback(async () => {
    setStatus("loading");
    setErrorMessage(null);
    setSaveStatus("idle");
    setSaveMessage(null);
    setReleaseStatus("idle");
    setReleaseMessage(null);

    const result = await fetchDetail();
    if (!result.ok) {
      setStatus("error");
      setErrorMessage(result.error);
      return;
    }

    setDetail(result.data);
    syncReleaseQuantities(result.data.items);
    setStatus("idle");
  }, [fetchDetail, syncReleaseQuantities]);

  const updateReleaseQuantity = useCallback((itemId: number, nextValue: string) => {
    if (nextValue === "") {
      setReleaseQuantities((current) => ({ ...current, [itemId]: "" }));
      return;
    }

    if (!/^\d+$/.test(nextValue)) return;

    setReleaseQuantities((current) => ({
      ...current,
      [itemId]: String(Number.parseInt(nextValue, 10)),
    }));
  }, []);

  const releaseSelections = useMemo(() => {
    if (!detail) return [] as { item: ShipmentItem; quantity: number; available: number }[];

    return detail.items
      .map((item) => {
        const quantity = parseReleaseQuantity(releaseQuantities[item.id]);
        return {
          item,
          quantity,
          available: getAvailableToRelease(item),
        };
      })
      .filter((entry) => entry.quantity > 0);
  }, [detail, releaseQuantities]);

  const hasOverAllocatedSelection = useMemo(
    () => releaseSelections.some((entry) => entry.quantity > entry.available),
    [releaseSelections],
  );

  const inFlightItems = useMemo(() => {
    if (!detail) return [] as ShipmentItem[];
    return detail.items.filter((item) => item.inFlightQuantity > 0);
  }, [detail]);

  const handleCreateRelease = useCallback(async () => {
    if (!detail) return;

    if (releaseSelections.length === 0) {
      setReleaseStatus("error");
      setReleaseMessage("Select at least one release quantity greater than 0.");
      return;
    }

    if (hasOverAllocatedSelection) {
      setReleaseStatus("error");
      setReleaseMessage("One or more release quantities exceed remaining.");
      return;
    }

    setReleaseStatus("saving");
    setReleaseMessage(null);

    try {
      const response = await fetch(`/api/shipments/${shipmentIdNumber}/releases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: releaseSelections.map((entry) => ({
            shipment_item_id: entry.item.id,
            quantity: entry.quantity,
          })),
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setReleaseStatus("error");
        setReleaseMessage(result?.error ?? "Unable to create release");
        return;
      }

      const refreshed = await fetchDetail();
      const itemsToReset = refreshed.ok ? refreshed.data.items : detail.items;

      if (refreshed.ok) {
        setDetail(refreshed.data);
      }

      syncReleaseQuantities(itemsToReset, "reset");

      setReleaseStatus("success");
      setReleaseMessage("Release event created.");
    } catch {
      setReleaseStatus("error");
      setReleaseMessage("Unable to create release");
    }
  }, [
    detail,
    fetchDetail,
    hasOverAllocatedSelection,
    releaseSelections,
    shipmentIdNumber,
    syncReleaseQuantities,
  ]);

  const handleSave = useCallback(async () => {
    if (!detail) return;

    setSaveStatus("saving");
    setSaveMessage(null);

    try {
      const response = await fetch(`/api/shipments/${shipmentIdNumber}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionId: detail.shipment.institutionId,
          items: detail.items.map((item) => ({
            id: item.id,
            numberReceived: item.numberReceived,
            emergedInTransit: item.emergedInTransit,
            damagedInTransit: item.damagedInTransit,
            diseasedInTransit: item.diseasedInTransit,
            parasite: item.parasite,
            nonEmergence: item.nonEmergence,
            poorEmergence: item.poorEmergence,
          })),
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setSaveStatus("error");
        setSaveMessage(result?.error ?? "Unable to save changes");
        return;
      }

      setSaveStatus("success");
      setSaveMessage("Changes saved.");
    } catch {
      setSaveStatus("error");
      setSaveMessage("Unable to save changes");
    }
  }, [detail, shipmentIdNumber]);

  useEffect(() => {
    let canceled = false;

    const run = async () => {
      setSaveStatus("idle");
      setSaveMessage(null);
      setReleaseStatus("idle");
      setReleaseMessage(null);

      const result = await fetchDetail();
      if (canceled) return;

      if (!result.ok) {
        setStatus("error");
        setErrorMessage(result.error);
        return;
      }

      setDetail(result.data);
      syncReleaseQuantities(result.data.items);
      setStatus("idle");
    };

    void run();

    return () => {
      canceled = true;
    };
  }, [fetchDetail, syncReleaseQuantities]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">Shipment #{shipmentId}</h1>
          <p className="text-muted-foreground">
            Track details and quality metrics for this shipment.
          </p>
          <p className="text-muted-foreground text-xs">
            Raw id: {String(rawShipmentId)} | Parsed:{" "}
            {Number.isNaN(shipmentIdNumber) ? "NaN" : shipmentIdNumber}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href={backHref}>Back to shipments</Link>
          </Button>
          <Button type="button" onClick={loadDetail}>
            Refresh
          </Button>
          <Button type="button" onClick={handleSave} disabled={!detail || saveStatus === "saving"}>
            {saveStatus === "saving" ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Shipment summary</CardTitle>
          <CardDescription>Shipment header details.</CardDescription>
        </CardHeader>
        <CardContent>
          {status === "loading" ? (
            <div className="text-muted-foreground text-sm" role="status" aria-live="polite">
              Loading shipment...
            </div>
          ) : status === "error" ? (
            <div className="text-destructive text-sm" role="status" aria-live="polite">
              {errorMessage ?? "Unable to load shipment"}
            </div>
          ) : detail ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-muted-foreground text-xs tracking-wide uppercase">
                  Supplier
                </div>
                <div className="text-base font-medium">{detail.shipment.supplierCode}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs tracking-wide uppercase">
                  Shipment date
                </div>
                <div className="text-base font-medium">
                  {formatDateTime(detail.shipment.shipmentDate)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs tracking-wide uppercase">
                  Arrival date
                </div>
                <div className="text-base font-medium">
                  {formatDateTime(detail.shipment.arrivalDate)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs tracking-wide uppercase">Created</div>
                <div className="text-base font-medium">
                  {formatDateTime(detail.shipment.createdAt)}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground text-sm">No shipment data found.</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Shipment items</CardTitle>
          <CardDescription>Line items recorded for this shipment.</CardDescription>
        </CardHeader>
        <CardContent>
          {saveMessage ? (
            <div
              className={
                saveStatus === "error" ? "text-destructive text-sm" : "text-sm text-emerald-600"
              }
              role="status"
              aria-live="polite"
            >
              {saveMessage}
            </div>
          ) : null}
          {status === "loading" ? (
            <div className="text-muted-foreground text-sm" role="status" aria-live="polite">
              Loading items...
            </div>
          ) : status === "error" ? (
            <div className="text-destructive text-sm" role="status" aria-live="polite">
              {errorMessage ?? "Unable to load shipment"}
            </div>
          ) : detail && detail.items.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Photo</TableHead>
                  <TableHead>Scientific name</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead>Emerged</TableHead>
                  <TableHead>Damaged</TableHead>
                  <TableHead>Diseased</TableHead>
                  <TableHead>Parasite</TableHead>
                  <TableHead>Non-emergence</TableHead>
                  <TableHead>Poor emergence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.scientificName}
                          className="size-10 rounded-md object-cover"
                          width={40}
                          height={40}
                        />
                      ) : (
                        <div className="text-muted-foreground text-xs">No photo</div>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate" title={item.scientificName}>
                      <span className="italic">{item.scientificName}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="outline"
                          aria-label={`Decrease received for ${item.scientificName}`}
                          onClick={() => updateMetric(item.id, "numberReceived", -1)}
                          disabled={item.numberReceived === 0}
                        >
                          -
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">
                          {item.numberReceived}
                        </span>
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="outline"
                          aria-label={`Increase received for ${item.scientificName}`}
                          onClick={() => updateMetric(item.id, "numberReceived", 1)}
                        >
                          +
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="outline"
                          aria-label={`Decrease emerged in transit for ${item.scientificName}`}
                          onClick={() => updateMetric(item.id, "emergedInTransit", -1)}
                          disabled={item.emergedInTransit === 0}
                        >
                          -
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">
                          {item.emergedInTransit}
                        </span>
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="outline"
                          aria-label={`Increase emerged in transit for ${item.scientificName}`}
                          onClick={() => updateMetric(item.id, "emergedInTransit", 1)}
                        >
                          +
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="outline"
                          aria-label={`Decrease damaged in transit for ${item.scientificName}`}
                          onClick={() => updateMetric(item.id, "damagedInTransit", -1)}
                          disabled={item.damagedInTransit === 0}
                        >
                          -
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">
                          {item.damagedInTransit}
                        </span>
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="outline"
                          aria-label={`Increase damaged in transit for ${item.scientificName}`}
                          onClick={() => updateMetric(item.id, "damagedInTransit", 1)}
                        >
                          +
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="outline"
                          aria-label={`Decrease diseased in transit for ${item.scientificName}`}
                          onClick={() => updateMetric(item.id, "diseasedInTransit", -1)}
                          disabled={item.diseasedInTransit === 0}
                        >
                          -
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">
                          {item.diseasedInTransit}
                        </span>
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="outline"
                          aria-label={`Increase diseased in transit for ${item.scientificName}`}
                          onClick={() => updateMetric(item.id, "diseasedInTransit", 1)}
                        >
                          +
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="outline"
                          aria-label={`Decrease parasite count for ${item.scientificName}`}
                          onClick={() => updateMetric(item.id, "parasite", -1)}
                          disabled={item.parasite === 0}
                        >
                          -
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">{item.parasite}</span>
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="outline"
                          aria-label={`Increase parasite count for ${item.scientificName}`}
                          onClick={() => updateMetric(item.id, "parasite", 1)}
                        >
                          +
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="outline"
                          aria-label={`Decrease non-emergence for ${item.scientificName}`}
                          onClick={() => updateMetric(item.id, "nonEmergence", -1)}
                          disabled={item.nonEmergence === 0}
                        >
                          -
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">
                          {item.nonEmergence}
                        </span>
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="outline"
                          aria-label={`Increase non-emergence for ${item.scientificName}`}
                          onClick={() => updateMetric(item.id, "nonEmergence", 1)}
                        >
                          +
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="outline"
                          aria-label={`Decrease poor emergence for ${item.scientificName}`}
                          onClick={() => updateMetric(item.id, "poorEmergence", -1)}
                          disabled={item.poorEmergence === 0}
                        >
                          -
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">
                          {item.poorEmergence}
                        </span>
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="outline"
                          aria-label={`Increase poor emergence for ${item.scientificName}`}
                          onClick={() => updateMetric(item.id, "poorEmergence", 1)}
                        >
                          +
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No items recorded</EmptyTitle>
                <EmptyDescription>Add shipment items to track quality metrics.</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button asChild variant="outline">
                  <Link href={backHref}>Back to shipments</Link>
                </Button>
              </EmptyContent>
            </Empty>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Release butterflies</CardTitle>
          <CardDescription>
            Choose a few items to release. This creates one release event and in-flight rows.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {releaseMessage ? (
            <div
              className={
                releaseStatus === "error" ? "text-destructive text-sm" : "text-sm text-emerald-600"
              }
              role="status"
              aria-live="polite"
            >
              {releaseMessage}
            </div>
          ) : null}

          {hasOverAllocatedSelection ? (
            <div className="text-destructive text-sm" role="status" aria-live="polite">
              One or more selected quantities exceed remaining.
            </div>
          ) : null}

          {status === "loading" ? (
            <div className="text-muted-foreground text-sm" role="status" aria-live="polite">
              Loading release options...
            </div>
          ) : detail && detail.items.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Scientific name</TableHead>
                    <TableHead>In flight</TableHead>
                    <TableHead>Available to release</TableHead>
                    <TableHead>Release quantity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.items.map((item) => {
                    const available = getAvailableToRelease(item);

                    return (
                      <TableRow key={`release-${item.id}`}>
                        <TableCell className="max-w-[260px] truncate" title={item.scientificName}>
                          <span className="italic">{item.scientificName}</span>
                        </TableCell>
                        <TableCell>{item.inFlightQuantity}</TableCell>
                        <TableCell>{available}</TableCell>
                        <TableCell className="w-[220px]">
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            step={1}
                            max={available}
                            value={releaseQuantities[item.id] ?? "0"}
                            onChange={(event) => updateReleaseQuantity(item.id, event.target.value)}
                            aria-label={`Release quantity for ${item.scientificName}`}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={handleCreateRelease}
                  disabled={
                    releaseStatus === "saving" ||
                    releaseSelections.length === 0 ||
                    hasOverAllocatedSelection
                  }
                >
                  {releaseStatus === "saving" ? "Creating release..." : "Create release event"}
                </Button>
              </div>
            </>
          ) : (
            <div className="text-muted-foreground text-sm">
              No shipment items available to release.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>In-flight table</CardTitle>
          <CardDescription>
            Released butterflies currently in flight from this shipment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === "loading" ? (
            <div className="text-muted-foreground text-sm" role="status" aria-live="polite">
              Loading in-flight rows...
            </div>
          ) : inFlightItems.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Scientific name</TableHead>
                  <TableHead>In flight</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inFlightItems.map((item) => (
                  <TableRow key={`inflight-${item.id}`}>
                    <TableCell className="max-w-[320px] truncate" title={item.scientificName}>
                      <span className="italic">{item.scientificName}</span>
                    </TableCell>
                    <TableCell>{item.inFlightQuantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-muted-foreground text-sm">
              No butterflies are currently in flight.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
