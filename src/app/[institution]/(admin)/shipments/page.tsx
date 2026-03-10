"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

type ShipmentListItem = {
  id: number;
  supplierCode: string;
  shipmentDate: string;
  arrivalDate: string;
  createdAt: string;
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

export default function ShipmentsPage() {
  const params = useParams<{ institution: string }>();
  const institution = params?.institution ?? "";

  const [shipments, setShipments] = useState<ShipmentListItem[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const addShipmentHref = useMemo(() => {
    if (!institution) return "/shipments/add";
    return `/${institution}/shipments/add`;
  }, [institution]);

  const detailHref = useCallback(
    (shipmentId: number) => {
      if (!institution) return `/shipments/${shipmentId}`;
      return `/${institution}/shipments/${shipmentId}`;
    },
    [institution],
  );

  const fetchShipments = useCallback(async () => {
    try {
      const response = await fetch("/api/shipments");
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        return {
          ok: false as const,
          error: (result?.error as string | undefined) ?? "Unable to load shipments",
        };
      }

      return {
        ok: true as const,
        data: (Array.isArray(result) ? result : []) as ShipmentListItem[],
      };
    } catch {
      return { ok: false as const, error: "Unable to load shipments" };
    }
  }, []);

  const loadShipments = useCallback(async () => {
    setStatus("loading");
    setErrorMessage(null);

    const result = await fetchShipments();
    if (!result.ok) {
      setStatus("error");
      setErrorMessage(result.error);
      return;
    }

    setShipments(result.data);
    setStatus("idle");
  }, [fetchShipments]);

  useEffect(() => {
    let canceled = false;

    const run = async () => {
      const result = await fetchShipments();
      if (canceled) return;

      if (!result.ok) {
        setStatus("error");
        setErrorMessage(result.error);
        return;
      }

      setShipments(result.data);
      setStatus("idle");
    };

    void run();

    return () => {
      canceled = true;
    };
  }, [fetchShipments]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">Shipments</h1>
          <p className="text-muted-foreground">
            Review and manage shipment records for your institution.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={loadShipments}>
            Refresh
          </Button>
          <Button asChild>
            <Link href={addShipmentHref}>Add shipment</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent shipments</CardTitle>
          <CardDescription>Sorted by shipment date.</CardDescription>
        </CardHeader>
        <CardContent>
          {status === "loading" ? (
            <div className="text-muted-foreground text-sm" role="status" aria-live="polite">
              Loading shipments...
            </div>
          ) : status === "error" ? (
            <div className="text-destructive text-sm" role="status" aria-live="polite">
              {errorMessage ?? "Unable to load shipments"}
            </div>
          ) : shipments.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No shipments yet</EmptyTitle>
                <EmptyDescription>
                  Add your first shipment to start tracking arrivals and quality metrics.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button asChild>
                  <Link href={addShipmentHref}>Add shipment</Link>
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shipment ID</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Shipment date</TableHead>
                  <TableHead>Arrival date</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shipments.map((shipment) => (
                  <TableRow key={shipment.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={detailHref(shipment.id)}
                        className="text-foreground underline-offset-4 hover:underline"
                      >
                        #{shipment.id}
                      </Link>
                    </TableCell>
                    <TableCell>{shipment.supplierCode}</TableCell>
                    <TableCell>{formatDateTime(shipment.shipmentDate)}</TableCell>
                    <TableCell>{formatDateTime(shipment.arrivalDate)}</TableCell>
                    <TableCell>{formatDateTime(shipment.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
