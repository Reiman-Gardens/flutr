import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ROUTES } from "@/lib/routes";
import {
  extractYear,
  filterRowsByDateRange,
  REVERSED_RANGE_ERROR,
  type ShipmentSummaryRow,
} from "@/lib/shipment-import-utils";

type PendingDelete =
  | { mode: "all" }
  | { mode: "year"; year: number }
  | { mode: "range"; from: string; to: string };

type ApiError = {
  error?: { message?: string };
};

type UseShipmentDeleteParams = {
  isTenantMode: boolean;
  institutionId: number;
  tenantHeaders: Record<string, string> | undefined;
  shipmentRows: ShipmentSummaryRow[] | null;
  onDeleteSuccess: () => void;
};

/**
 * Manages all delete state, derived counts, and the confirm-then-delete flow
 * for the Danger Zone section.
 */
export function useShipmentDelete({
  isTenantMode,
  institutionId,
  tenantHeaders,
  shipmentRows,
  onDeleteSuccess,
}: UseShipmentDeleteParams) {
  const [deleteYear, setDeleteYear] = useState("");
  const [deleteRangeFrom, setDeleteRangeFrom] = useState("");
  const [deleteRangeTo, setDeleteRangeTo] = useState("");
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteYearParsed = useMemo(() => {
    const n = parseInt(deleteYear, 10);
    return !isNaN(n) && n >= 1900 && n <= 2100 ? n : null;
  }, [deleteYear]);

  const deleteAllCount = shipmentRows?.length ?? 0;

  const deleteYearCount = useMemo(() => {
    if (!shipmentRows || deleteYearParsed === null) return 0;
    return shipmentRows.filter((r) => extractYear(r.shipmentDate) === deleteYearParsed).length;
  }, [shipmentRows, deleteYearParsed]);

  const deleteRangeError =
    deleteRangeFrom && deleteRangeTo && deleteRangeFrom > deleteRangeTo
      ? REVERSED_RANGE_ERROR
      : null;

  const deleteRangeCount = useMemo(() => {
    if (!shipmentRows) return 0;
    return filterRowsByDateRange(shipmentRows, deleteRangeFrom, deleteRangeTo).length;
  }, [shipmentRows, deleteRangeFrom, deleteRangeTo]);

  const pendingDeleteCount =
    pendingDelete?.mode === "all"
      ? deleteAllCount
      : pendingDelete?.mode === "year"
        ? deleteYearCount
        : deleteRangeCount;

  async function handleDelete() {
    if (!pendingDelete) return;

    setIsDeleting(true);
    try {
      const deleteUrl = isTenantMode
        ? ROUTES.tenant.shipmentsApi
        : ROUTES.admin.institutionShipmentsApi(institutionId);

      const response = await fetch(deleteUrl, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...tenantHeaders },
        body: JSON.stringify(pendingDelete),
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as ApiError | null;
        toast.error(errorBody?.error?.message ?? "Failed to delete shipment data.");
        return;
      }

      const data = (await response.json()) as { deleted: number };
      toast.success(
        `Deleted ${data.deleted.toLocaleString()} shipment${data.deleted !== 1 ? "s" : ""}.`,
      );
      setPendingDelete(null);
      onDeleteSuccess();
    } catch {
      toast.error("Failed to delete shipment data.");
    } finally {
      setIsDeleting(false);
    }
  }

  return {
    // Input state
    deleteYear,
    setDeleteYear,
    deleteRangeFrom,
    setDeleteRangeFrom,
    deleteRangeTo,
    setDeleteRangeTo,
    // Derived counts
    deleteYearParsed,
    deleteAllCount,
    deleteYearCount,
    deleteRangeError,
    deleteRangeCount,
    // Dialog state
    pendingDelete,
    setPendingDelete,
    pendingDeleteCount,
    // Action
    isDeleting,
    handleDelete,
  };
}
