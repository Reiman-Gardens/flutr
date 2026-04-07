import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ROUTES } from "@/lib/routes";
import {
  detectSourceKind,
  filterRowsByDateRange,
  readUploadFileAsText,
  REVERSED_RANGE_ERROR,
  type CommitResponse,
  type PreviewResponse,
  type ShipmentSummaryRow,
  type SourceKind,
} from "@/lib/shipment-import-utils";
import { downloadBlob } from "@/lib/utils";

type ApiError = {
  error?: { message?: string };
};

type UseShipmentImportParams = {
  previewUrl: string;
  commitUrl: string;
  isTenantMode: boolean;
  institutionId: number;
  tenantSlug: string | undefined;
  tenantHeaders: Record<string, string> | undefined;
  tenantReady: boolean;
  /** Rows from the viewer — used to derive the live export count. */
  shipmentRows: ShipmentSummaryRow[] | null;
  /** Called after a successful commit so the viewer can refresh. */
  onImportSuccess: () => void;
};

/**
 * Manages all import, file-reading, and export state for the shipment data tab.
 */
export function useShipmentImport({
  previewUrl,
  commitUrl,
  isTenantMode,
  institutionId,
  tenantSlug,
  tenantHeaders,
  tenantReady,
  shipmentRows,
  onImportSuccess,
}: UseShipmentImportParams) {
  // File / paste input state
  const [rawText, setRawText] = useState("");
  const [sourceKind, setSourceKind] = useState<SourceKind>("paste");
  const [sourceFileName, setSourceFileName] = useState<string | undefined>(undefined);
  const [isPasteMode, setIsPasteMode] = useState(false);
  const [isReadingFile, setIsReadingFile] = useState(false);

  // Preview / commit state
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [commitSummary, setCommitSummary] = useState<CommitResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Import options
  const [allowSpeciesAutocreate, setAllowSpeciesAutocreate] = useState(false);
  const [allowDuplicateHeaders, setAllowDuplicateHeaders] = useState(false);

  // Export state
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  async function processFile(file: File) {
    const detected = detectSourceKind(file.name);
    setSourceKind(detected);
    setSourceFileName(file.name);
    setPreview(null);
    setCommitSummary(null);
    setErrorMessage(null);
    setIsPasteMode(false);
    setIsReadingFile(true);
    try {
      const text = await readUploadFileAsText(file, detected);
      setRawText(text);
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message ? error.message : "Unable to read file contents.",
      );
    } finally {
      setIsReadingFile(false);
    }
  }

  function handlePasteChange(text: string) {
    setRawText(text);
    setSourceKind("paste");
    setSourceFileName(undefined);
    setPreview(null);
    setCommitSummary(null);
    setErrorMessage(null);
  }

  function handleReset() {
    setRawText("");
    setSourceKind("paste");
    setSourceFileName(undefined);
    setPreview(null);
    setCommitSummary(null);
    setErrorMessage(null);
    setIsPasteMode(false);
  }

  async function handleParsePreview() {
    if (!tenantReady) {
      setErrorMessage("Tenant context is missing. Refresh and try again.");
      return;
    }
    if (!rawText.trim()) {
      setErrorMessage("Paste data or upload a file before parsing.");
      return;
    }
    setIsParsing(true);
    setPreview(null);
    setCommitSummary(null);
    setErrorMessage(null);
    try {
      const response = await fetch(previewUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...tenantHeaders },
        body: JSON.stringify({
          raw_text: rawText,
          source: { kind: sourceKind, file_name: sourceFileName },
        }),
      });
      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as ApiError | null;
        setErrorMessage(errorBody?.error?.message ?? "Unable to parse preview.");
        return;
      }
      const data = (await response.json()) as PreviewResponse;
      setPreview(data);
    } catch {
      setErrorMessage("Unable to parse preview.");
    } finally {
      setIsParsing(false);
    }
  }

  async function handleCommitImport() {
    if (!tenantReady) {
      setErrorMessage("Tenant context is missing. Refresh and try again.");
      return;
    }
    if (!preview) {
      setErrorMessage("Run parse preview before importing.");
      return;
    }
    setIsImporting(true);
    setErrorMessage(null);
    setCommitSummary(null);
    try {
      const response = await fetch(commitUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...tenantHeaders },
        body: JSON.stringify({
          preview_hash: preview.preview_hash,
          shipments: preview.shipments,
          options: {
            allow_species_autocreate: allowSpeciesAutocreate,
            allow_duplicate_headers: allowDuplicateHeaders,
          },
        }),
      });
      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as ApiError | null;
        setErrorMessage(errorBody?.error?.message ?? "Unable to commit import.");
        return;
      }
      const data = (await response.json()) as CommitResponse;
      setCommitSummary(data);
      onImportSuccess();
    } catch {
      setErrorMessage("Unable to commit import.");
    } finally {
      setIsImporting(false);
    }
  }

  async function handleExportData() {
    if (!tenantReady) {
      setErrorMessage("Tenant context is missing. Refresh and try again.");
      return;
    }
    setErrorMessage(null);
    const range =
      exportFrom || exportTo
        ? { from: exportFrom || undefined, to: exportTo || undefined }
        : undefined;
    const currentExportUrl = isTenantMode
      ? ROUTES.tenant.shipmentExportApi("xlsx", range)
      : ROUTES.admin.institutionExportApi(institutionId, "xlsx", range);

    setIsExporting(true);
    try {
      const response = await fetch(currentExportUrl, { method: "GET", headers: tenantHeaders });
      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as ApiError | null;
        setErrorMessage(errorBody?.error?.message ?? "Unable to export data.");
        return;
      }
      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition");
      const fileNameMatch = disposition?.match(/filename="?([^";]+)"?/i);
      const fileName =
        fileNameMatch?.[1] ??
        (isTenantMode
          ? `${tenantSlug ?? "institution"}-shipments.xlsx`
          : `institution-${institutionId}-shipments.xlsx`);
      downloadBlob(blob, fileName);
      toast.success("Export downloaded.");
    } catch {
      setErrorMessage("Unable to export data.");
    } finally {
      setIsExporting(false);
    }
  }

  // -------------------------------------------------------------------------
  // Derived values
  // -------------------------------------------------------------------------

  const canCommit =
    !!preview &&
    preview.row_errors.length === 0 &&
    preview.shipments.length > 0 &&
    (allowSpeciesAutocreate || preview.unknown_species.length === 0);

  const exportRangeError =
    exportFrom && exportTo && exportFrom > exportTo ? REVERSED_RANGE_ERROR : null;

  const rangeShipmentCount = useMemo(() => {
    if (!shipmentRows) return null;
    if (!exportFrom && !exportTo) return shipmentRows.length;
    return filterRowsByDateRange(shipmentRows, exportFrom, exportTo).length;
  }, [shipmentRows, exportFrom, exportTo]);

  const importStep: 1 | 2 | 3 = commitSummary ? 3 : rawText.trim() ? 2 : 1;

  // -------------------------------------------------------------------------
  // Return
  // -------------------------------------------------------------------------

  return {
    // Drop zone
    rawText,
    sourceFileName,
    processFile,
    isReadingFile,
    isPasteMode,
    setIsPasteMode,
    handlePasteChange,
    // Results panel
    preview,
    commitSummary,
    handleReset,
    // Action buttons
    handleParsePreview,
    handleCommitImport,
    isParsing,
    isImporting,
    canCommit,
    errorMessage,
    // Step indicator
    importStep,
    // Import options (sidebar)
    allowSpeciesAutocreate,
    setAllowSpeciesAutocreate,
    allowDuplicateHeaders,
    setAllowDuplicateHeaders,
    // Export (sidebar)
    exportFrom,
    setExportFrom,
    exportTo,
    setExportTo,
    exportRangeError,
    handleExportData,
    isExporting,
    rangeShipmentCount,
  };
}
