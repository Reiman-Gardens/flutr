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

type ShipmentsPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const SHIPMENTS_PAGE_LIMIT = 50;

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
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<ShipmentsPagination>({
    page: 1,
    limit: SHIPMENTS_PAGE_LIMIT,
    total: 0,
    totalPages: 1,
  });
  const [status, setStatus] = useState<"idle" | "loading" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deleteStatus, setDeleteStatus] = useState<"idle" | "deleting" | "error" | "success">(
    "idle",
  );
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [deletingShipmentId, setDeletingShipmentId] = useState<number | null>(null);

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

  const fetchShipments = useCallback(
    async (targetPage: number) => {
      try {
        const queryParams = new URLSearchParams({
          page: String(targetPage),
          limit: String(SHIPMENTS_PAGE_LIMIT),
        });

        const url = `/api/tenant/shipments?${queryParams.toString()}`;

        const response = await fetch(url, {
          headers: {
            "x-tenant-slug": institution,
          },
        });

        const result = await response.json().catch(() => null);

        if (!response.ok) {
          return { ok: false as const, error: "Failed to load shipments." };
        }

        const shipmentsData = Array.isArray(result?.shipments) ? result.shipments : [];
        const parsedPagination = result?.pagination;

        const paginationData: ShipmentsPagination = {
          page:
            typeof parsedPagination?.page === "number" && parsedPagination.page > 0
              ? parsedPagination.page
              : targetPage,
          limit:
            typeof parsedPagination?.limit === "number" && parsedPagination.limit > 0
              ? parsedPagination.limit
              : SHIPMENTS_PAGE_LIMIT,
          total:
            typeof parsedPagination?.total === "number" && parsedPagination.total >= 0
              ? parsedPagination.total
              : shipmentsData.length,
          totalPages:
            typeof parsedPagination?.totalPages === "number" && parsedPagination.totalPages > 0
              ? parsedPagination.totalPages
              : 1,
        };

        return {
          ok: true as const,
          data: shipmentsData,
          pagination: paginationData,
        };
      } catch {
        return { ok: false as const, error: "Failed to load shipments." };
      }
    },
    [institution],
  );

  const loadShipments = useCallback(
    async (targetPage: number) => {
      setStatus("loading");
      setErrorMessage(null);
      setDeleteStatus("idle");
      setDeleteMessage(null);

      const result = await fetchShipments(targetPage);
      if (!result.ok) {
        setStatus("error");
        setErrorMessage(result.error);
        return;
      }

      setShipments(result.data);
      setPagination(result.pagination);
      setStatus("idle");
    },
    [fetchShipments],
  );

  const handleDeleteShipment = useCallback(
    async (shipmentId: number) => {
      if (!Number.isInteger(shipmentId) || shipmentId <= 0) return;

      const confirmed = window.confirm(`Delete shipment #${shipmentId}? This cannot be undone.`);
      if (!confirmed) return;

      setDeletingShipmentId(shipmentId);
      setDeleteStatus("deleting");
      setDeleteMessage(null);

      try {
        const response = await fetch(`/api/tenant/shipments/${shipmentId}`, {
          method: "DELETE",
          headers: {
            "x-tenant-slug": institution,
          },
        });

        const result = await response.json().catch(() => null);

        if (!response.ok) {
          setDeleteStatus("error");
          setDeleteMessage(result?.error?.message ?? "Unable to delete shipment");
          return;
        }

        setShipments((current) => current.filter((s) => s.id !== shipmentId));

        setDeleteStatus("success");
        setDeleteMessage(`Shipment #${shipmentId} deleted.`);
      } catch {
        setDeleteStatus("error");
        setDeleteMessage("Unable to delete shipment");
      } finally {
        setDeletingShipmentId(null);
      }
    },
    [institution],
  );

  const handleDeleteAllShipments = useCallback(async () => {
    if (shipments.length === 0) return;

    const confirmed = window.confirm(
      `Delete all ${shipments.length} shipments? This cannot be undone.`,
    );
    if (!confirmed) return;

    setDeleteStatus("deleting");
    setDeleteMessage(null);

    try {
      const response = await fetch("/api/tenant/shipments", {
        method: "DELETE",
        headers: {
          "x-tenant-slug": institution,
        },
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setDeleteStatus("error");
        setDeleteMessage(result?.error?.message ?? "Unable to delete shipments");
        return;
      }

      const deletedCount = result?.deleted ?? 0;

      setShipments([]);
      setDeleteStatus("success");
      setDeleteMessage(
        deletedCount > 0
          ? `Deleted ${deletedCount} shipment${deletedCount === 1 ? "" : "s"}.`
          : "No shipments were deleted.",
      );
    } catch {
      setDeleteStatus("error");
      setDeleteMessage("Unable to delete shipments");
    }
  }, [shipments.length, institution]);

  useEffect(() => {
    void loadShipments(page);
  }, [page, loadShipments]);

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
          <Button variant="outline" onClick={() => void loadShipments(page)}>
            Refresh
          </Button>

          <Button
            variant="destructive"
            onClick={handleDeleteAllShipments}
            disabled={shipments.length === 0 || deleteStatus === "deleting"}
          >
            {deleteStatus === "deleting" ? "Deleting..." : "Delete all shipments"}
          </Button>

          <Button asChild>
            <Link href={addShipmentHref}>Add shipment</Link>
          </Button>
        </div>
      </div>

      {deleteMessage ? (
        <div
          className={
            deleteStatus === "error" ? "text-destructive text-sm" : "text-sm text-emerald-700"
          }
        >
          {deleteMessage}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Recent shipments</CardTitle>
          <CardDescription>Sorted by shipment date.</CardDescription>
        </CardHeader>

        <CardContent>
          {status === "loading" ? (
            <div className="text-muted-foreground text-sm">Loading shipments...</div>
          ) : status === "error" ? (
            <div className="text-destructive text-sm">
              {errorMessage ?? "Unable to load shipments"}
            </div>
          ) : shipments.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No shipments yet</EmptyTitle>
                <EmptyDescription>
                  Add your first shipment to start tracking arrivals.
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
                  <TableHead>ID</TableHead>
                  <TableHead>Supplier Code</TableHead>
                  <TableHead>Shipment Date</TableHead>
                  <TableHead>Arrival Date</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {shipments.map((shipment) => (
                  <TableRow key={shipment.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={detailHref(shipment.id)}
                        className="underline-offset-4 hover:underline"
                      >
                        #{shipment.id}
                      </Link>
                    </TableCell>

                    <TableCell>{shipment.supplierCode}</TableCell>
                    <TableCell>{formatDateTime(shipment.shipmentDate)}</TableCell>
                    <TableCell>{formatDateTime(shipment.arrivalDate)}</TableCell>
                    <TableCell>{formatDateTime(shipment.createdAt)}</TableCell>

                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteShipment(shipment.id)}
                        disabled={deleteStatus === "deleting" || deletingShipmentId === shipment.id}
                      >
                        {deletingShipmentId === shipment.id ? "Deleting..." : "Delete"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {status !== "error" ? (
            <div className="mt-4 flex items-center justify-end gap-4">
              <Button
                variant="outline"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={status === "loading" || page === 1}
              >
                Previous
              </Button>

              <span className="text-muted-foreground text-sm">
                Page {pagination.page} of {pagination.totalPages}
              </span>

              <Button
                variant="outline"
                onClick={() => setPage((current) => current + 1)}
                disabled={status === "loading" || page >= pagination.totalPages}
              >
                Next
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
