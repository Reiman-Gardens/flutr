import { useCallback, useEffect, useState } from "react";
import { type ShipmentSummaryRow } from "@/lib/shipment-import-utils";

type ShipmentSummaryResponse = {
  shipments: ShipmentSummaryRow[];
};

type ApiError = {
  error?: { message?: string };
};

type UseShipmentViewerParams = {
  summaryUrl: string;
  tenantHeaders: Record<string, string> | undefined;
  tenantReady: boolean;
};

type UseShipmentViewerReturn = {
  shipmentRows: ShipmentSummaryRow[] | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

/**
 * Fetches and manages the shipment summary list for an institution.
 * Automatically loads on mount and whenever its parameters change.
 */
export function useShipmentViewer({
  summaryUrl,
  tenantHeaders,
  tenantReady,
}: UseShipmentViewerParams): UseShipmentViewerReturn {
  const [shipmentRows, setShipmentRows] = useState<ShipmentSummaryRow[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!tenantReady) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(summaryUrl, { method: "GET", headers: tenantHeaders });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as ApiError | null;
        setError(body?.error?.message ?? "Failed to load shipment records.");
        return;
      }
      const data = (await res.json()) as ShipmentSummaryResponse;
      setShipmentRows(data.shipments);
    } catch {
      setError("Failed to load shipment records.");
    } finally {
      setIsLoading(false);
    }
  }, [summaryUrl, tenantReady, tenantHeaders]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { shipmentRows, isLoading, error, refresh };
}
