"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { Link } from "@/components/ui/link";
import { MoreHorizontal, Trash2 } from "lucide-react";

import { ROUTES } from "@/lib/routes";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { ShipmentStatusBadge } from "@/components/tenant/shipments/shipment-status-badge";
import type { ShipmentListRow } from "@/components/tenant/shipments/types";

const PAGE_LIMIT = 50;

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

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export default function ShipmentsListPage() {
  const params = useParams<{ institution: string }>();
  const slug = params?.institution ?? "";

  const [shipments, setShipments] = useState<ShipmentListRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: PAGE_LIMIT,
    total: 0,
    totalPages: 1,
  });
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const tenantHeaders = useMemo(() => ({ "x-tenant-slug": slug }), [slug]);
  const addHref = ROUTES.tenant.shipmentAdd(slug);
  const detailHref = useCallback((id: number) => ROUTES.tenant.shipmentById(slug, id), [slug]);
  const releaseHref = useCallback(
    (id: number) => ROUTES.tenant.shipmentReleaseNew(slug, id),
    [slug],
  );

  const loadShipments = useCallback(
    async (targetPage: number, signal?: AbortSignal) => {
      setStatus("loading");
      setErrorMessage(null);
      try {
        const search = new URLSearchParams({
          page: String(targetPage),
          limit: String(PAGE_LIMIT),
        });
        const response = await fetch(`/api/tenant/shipments?${search.toString()}`, {
          headers: tenantHeaders,
          signal,
        });
        const result = await response.json().catch(() => null);
        if (signal?.aborted) return;
        if (!response.ok) {
          setStatus("error");
          setErrorMessage(result?.error?.message ?? "Failed to load shipments.");
          return;
        }
        setShipments(Array.isArray(result?.shipments) ? result.shipments : []);
        setPagination({
          page: result?.pagination?.page ?? targetPage,
          limit: result?.pagination?.limit ?? PAGE_LIMIT,
          total: result?.pagination?.total ?? 0,
          totalPages: result?.pagination?.totalPages ?? 1,
        });
        setStatus("idle");
      } catch (err) {
        if (signal?.aborted) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setStatus("error");
        setErrorMessage("Failed to load shipments.");
      }
    },
    [tenantHeaders],
  );

  useEffect(() => {
    const ac = new AbortController();
    void loadShipments(page, ac.signal);
    return () => ac.abort();
  }, [page, loadShipments]);

  const confirmDelete = async () => {
    if (deleteTargetId === null) return;
    const id = deleteTargetId;
    setBusyId(id);
    try {
      const response = await fetch(`/api/tenant/shipments/${id}`, {
        method: "DELETE",
        headers: tenantHeaders,
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        setErrorMessage(result?.error?.message ?? "Unable to delete shipment.");
        return;
      }
      setShipments((current) => current.filter((s) => s.id !== id));
    } finally {
      setBusyId(null);
      setDeleteTargetId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold">Shipments</h1>
          <p className="text-muted-foreground">
            Review every shipment for your institution and track which ones still have butterflies
            to release.
          </p>
        </div>
        <Button asChild>
          <Link href={addHref}>Add shipment</Link>
        </Button>
      </div>

      {errorMessage && (
        <div className="text-destructive text-sm" role="alert">
          {errorMessage}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent shipments</CardTitle>
          <CardDescription>Sorted by shipment date, newest first.</CardDescription>
        </CardHeader>
        <CardContent>
          {status === "loading" ? (
            <div
              className="text-muted-foreground text-sm"
              role="status"
              aria-live="polite"
              aria-busy="true"
            >
              Loading shipments…
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
                  <Link href={addHref}>Add shipment</Link>
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Shipment date</TableHead>
                    <TableHead>Arrival date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shipments.map((shipment) => {
                    // The supplier cell is a real anchor so keyboard and
                    // screen-reader users get native link semantics. The
                    // action buttons stay in the rightmost cell and do not
                    // rely on row-level click propagation.
                    return (
                      <TableRow key={shipment.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          <Link
                            href={detailHref(shipment.id)}
                            aria-label={`Open shipment from ${shipment.supplierCode}`}
                            className="focus-visible:ring-ring rounded-sm underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:outline-none"
                          >
                            {shipment.supplierCode}
                          </Link>
                        </TableCell>
                        <TableCell>{formatDate(shipment.shipmentDate)}</TableCell>
                        <TableCell>{formatDate(shipment.arrivalDate)}</TableCell>
                        <TableCell>
                          <ShipmentStatusBadge
                            remaining={shipment.remaining}
                            isCompleted={shipment.isCompleted}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {!shipment.isCompleted && (
                              <Button asChild size="sm">
                                <Link href={releaseHref(shipment.id)}>Add release</Link>
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  aria-label={`More actions for ${shipment.supplierCode}`}
                                  disabled={busyId === shipment.id}
                                >
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onSelect={() => setDeleteTargetId(shipment.id)}
                                >
                                  <Trash2 className="size-4" />
                                  Delete shipment
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {status !== "error" && pagination.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1 || status === "loading"}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                Previous
              </Button>
              <span className="text-muted-foreground text-sm">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pagination.totalPages || status === "loading"}
                onClick={() => setPage((prev) => prev + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={deleteTargetId !== null}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this shipment?</AlertDialogTitle>
            <AlertDialogDescription>
              Shipments with line items or releases cannot be deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
