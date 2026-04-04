"use client";

import { ChangeEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ROUTES } from "@/lib/routes";

type InstitutionDataTabProps = {
  institutionId: number;
  mode?: "platform" | "tenant";
  tenantSlug?: string;
};

type SourceKind = "xlsx" | "xls" | "csv" | "tsv" | "txt" | "paste";

type PreviewResponse = {
  summary: {
    total_rows: number;
    shipments_detected: number;
    row_errors: number;
    warnings: number;
    unknown_species: number;
    unknown_suppliers: number;
  };
  row_errors: string[];
  warnings: string[];
  unknown_species: string[];
  unknown_suppliers: string[];
  shipments: {
    supplier_code: string;
    shipment_date: string;
    arrival_date: string;
    items: {
      scientific_name: string;
      number_received: number;
      emerged_in_transit: number;
      damaged_in_transit: number;
      diseased_in_transit: number;
      parasite: number;
      non_emergence: number;
      poor_emergence: number;
    }[];
  }[];
  preview_hash: string;
};

type CommitResponse = {
  created: number;
  failed: number;
  skipped: number;
  failures: string[];
  warnings: string[];
};

type ApiError = {
  error?: {
    message?: string;
  };
};

function detectSourceKind(fileName: string): SourceKind {
  const lowerFileName = fileName.trim().toLowerCase();
  if (lowerFileName.endsWith(".xlsx")) return "xlsx";
  if (lowerFileName.endsWith(".xls")) return "xls";
  if (lowerFileName.endsWith(".csv")) return "csv";
  if (lowerFileName.endsWith(".tsv")) return "tsv";
  if (lowerFileName.endsWith(".txt")) return "txt";
  return "txt";
}

function rowsToTabDelimitedText(rows: Array<Array<string | number | boolean | null>>) {
  return rows.map((row) => row.map((cell) => String(cell ?? "").trim()).join("\t")).join("\n");
}

async function readUploadFileAsText(file: File, kind: SourceKind): Promise<string> {
  if (kind === "xlsx" || kind === "xls") {
    const xlsx = await import("xlsx");
    const workbook = xlsx.read(await file.arrayBuffer(), {
      type: "array",
      cellDates: false,
    });

    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error("Workbook does not contain any sheets.");
    }

    const firstSheet = workbook.Sheets[firstSheetName];
    const rows = xlsx.utils.sheet_to_json<Array<string | number | boolean | null>>(firstSheet, {
      header: 1,
      raw: false,
      defval: "",
    });

    return rowsToTabDelimitedText(rows);
  }

  return file.text();
}

export default function InstitutionDataTab({
  institutionId,
  mode = "platform",
  tenantSlug,
}: InstitutionDataTabProps) {
  const isTenantMode = mode === "tenant";
  const [rawText, setRawText] = useState("");
  const [sourceKind, setSourceKind] = useState<SourceKind>("paste");
  const [sourceFileName, setSourceFileName] = useState<string | undefined>(undefined);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [commitSummary, setCommitSummary] = useState<CommitResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [allowSpeciesAutocreate, setAllowSpeciesAutocreate] = useState(false);
  const [allowDuplicateHeaders, setAllowDuplicateHeaders] = useState(false);

  const tenantReady = !isTenantMode || !!tenantSlug;
  const tenantHeaders = isTenantMode && tenantSlug ? { "x-tenant-slug": tenantSlug } : undefined;
  const previewUrl = isTenantMode
    ? ROUTES.tenant.shipmentImportPreviewApi
    : ROUTES.admin.institutionImportPreview(institutionId);
  const commitUrl = isTenantMode
    ? ROUTES.tenant.shipmentImportCommitApi
    : ROUTES.admin.institutionImportCommit(institutionId);
  const exportUrl = isTenantMode
    ? ROUTES.tenant.shipmentExportApi("xlsx")
    : ROUTES.admin.institutionExportApi(institutionId, "xlsx");

  async function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const detected = detectSourceKind(file.name);
    setSourceKind(detected);
    setSourceFileName(file.name);
    setPreview(null);
    setCommitSummary(null);
    setErrorMessage(null);

    try {
      const text = await readUploadFileAsText(file, detected);
      setRawText(text);
      setCommitSummary(null);
    } catch (error) {
      if (error instanceof Error && error.message) {
        setErrorMessage(error.message);
        return;
      }
      setErrorMessage("Unable to read file contents.");
    }
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
          source: {
            kind: sourceKind,
            file_name: sourceFileName,
          },
        }),
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as ApiError | null;
        setErrorMessage(errorBody?.error?.message ?? "Unable to parse preview.");
        setIsParsing(false);
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
        setIsImporting(false);
        return;
      }

      const data = (await response.json()) as CommitResponse;
      setCommitSummary(data);
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

    try {
      const response = await fetch(exportUrl, {
        method: "GET",
        headers: tenantHeaders,
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as ApiError | null;
        setErrorMessage(errorBody?.error?.message ?? "Unable to export data.");
        return;
      }

      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition");
      const fileNameMatch = disposition?.match(/filename=\"?([^\";]+)\"?/i);
      const fileName =
        fileNameMatch?.[1] ??
        (isTenantMode
          ? `${tenantSlug ?? "institution"}-shipments.xlsx`
          : `institution-${institutionId}-shipments.xlsx`);

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      setErrorMessage("Unable to export data.");
    }
  }

  const canCommit =
    !!preview &&
    preview.row_errors.length === 0 &&
    preview.shipments.length > 0 &&
    (allowSpeciesAutocreate || preview.unknown_species.length === 0);

  return (
    <div className="mt-6 flex flex-col gap-4">
      <h2 className="text-sm font-semibold">Historical Shipment Data</h2>

      <p className="text-muted-foreground text-sm">
        {isTenantMode
          ? "Institution admins can import historical shipment records and export current institution data for reporting."
          : "Superusers can import historical shipment records from Excel files and export current institution data for reporting or migration purposes."}
      </p>

      <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
        <div className="space-y-2">
          <Label htmlFor="historical-import-file">Upload file</Label>
          <Input
            id="historical-import-file"
            type="file"
            accept=".xlsx,.xls,.csv,.tsv,.txt"
            onChange={handleFileSelection}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="historical-import-data">Excel/CSV Data</Label>
        <Textarea
          id="historical-import-data"
          value={rawText}
          onChange={(event) => {
            setRawText(event.target.value);
            setSourceKind("paste");
            setSourceFileName(undefined);
            setPreview(null);
            setCommitSummary(null);
            setErrorMessage(null);
          }}
          className="min-h-56 font-mono text-xs"
          placeholder="Paste copied rows from legacy Excel export here..."
        />
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={handleParsePreview} disabled={isParsing}>
          {isParsing ? "Parsing..." : "Parse Preview"}
        </Button>
        <Button
          variant="outline"
          onClick={handleCommitImport}
          disabled={isImporting || !canCommit || !tenantReady}
        >
          {isImporting ? "Importing..." : "Commit Import"}
        </Button>
        <Button variant="outline" onClick={handleExportData} disabled={!tenantReady}>
          Export XLSX
        </Button>
      </div>

      <div className="flex flex-col gap-2 rounded-md border p-3">
        <Label className="text-xs font-medium">Commit Options</Label>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={allowSpeciesAutocreate}
            onChange={(event) => setAllowSpeciesAutocreate(event.target.checked)}
            disabled={isTenantMode}
          />
          Allow auto-create unknown species {isTenantMode ? "(platform only)" : "(superuser only)"}
        </label>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={allowDuplicateHeaders}
            onChange={(event) => setAllowDuplicateHeaders(event.target.checked)}
          />
          Allow duplicate shipment headers
        </label>
      </div>

      {errorMessage ? (
        <p className="text-destructive text-xs" role="status" aria-live="polite">
          {errorMessage}
        </p>
      ) : null}

      {preview ? (
        <div className="space-y-3 rounded-md border p-4">
          <p className="text-sm font-medium">Preview Summary</p>
          <div className="grid gap-2 text-sm md:grid-cols-2">
            <p>Total parsed rows: {preview.summary.total_rows}</p>
            <p>Shipments detected: {preview.summary.shipments_detected}</p>
            <p>Row errors: {preview.summary.row_errors}</p>
            <p>Warnings: {preview.summary.warnings}</p>
            <p>Unknown species: {preview.summary.unknown_species}</p>
            <p>Unknown suppliers: {preview.summary.unknown_suppliers}</p>
          </div>

          {preview.row_errors.length > 0 ? (
            <div className="space-y-1">
              <p className="text-destructive text-sm font-medium">Row Errors</p>
              <ul className="text-destructive list-disc space-y-1 pl-5 text-xs">
                {preview.row_errors.slice(0, 20).map((rowError) => (
                  <li key={rowError}>{rowError}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {preview.warnings.length > 0 ? (
            <div className="space-y-1">
              <p className="text-sm font-medium text-amber-700">Warnings</p>
              <ul className="list-disc space-y-1 pl-5 text-xs text-amber-700">
                {preview.warnings.slice(0, 20).map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {preview.unknown_species.length > 0 ? (
            <div className="space-y-1">
              <p className="text-sm font-medium text-amber-700">Unknown Species</p>
              <ul className="list-disc space-y-1 pl-5 text-xs text-amber-700">
                {preview.unknown_species.slice(0, 20).map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {preview.unknown_suppliers.length > 0 ? (
            <div className="space-y-1">
              <p className="text-sm font-medium text-amber-700">Unknown Suppliers</p>
              <ul className="list-disc space-y-1 pl-5 text-xs text-amber-700">
                {preview.unknown_suppliers.slice(0, 20).map((code) => (
                  <li key={code}>{code}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <p className="text-muted-foreground text-xs">
            Preview hash: <span className="font-mono">{preview.preview_hash}</span>
          </p>
        </div>
      ) : null}

      {commitSummary ? (
        <div className="space-y-2 rounded-md border p-4">
          <p className="text-sm font-medium">Import Summary</p>
          <div className="grid gap-2 text-sm md:grid-cols-3">
            <p>Created: {commitSummary.created}</p>
            <p>Failed: {commitSummary.failed}</p>
            <p>Skipped: {commitSummary.skipped}</p>
          </div>

          {commitSummary.warnings.length > 0 ? (
            <div className="space-y-1">
              <p className="text-sm font-medium text-amber-700">Import Warnings</p>
              <ul className="list-disc space-y-1 pl-5 text-xs text-amber-700">
                {commitSummary.warnings.slice(0, 20).map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {commitSummary.failures.length > 0 ? (
            <div className="space-y-1">
              <p className="text-destructive text-sm font-medium">Import Failures</p>
              <ul className="text-destructive list-disc space-y-1 pl-5 text-xs">
                {commitSummary.failures.slice(0, 20).map((failure) => (
                  <li key={failure}>{failure}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-emerald-700" role="status" aria-live="polite">
              Import completed without shipment failures.
            </p>
          )}
        </div>
      ) : null}

      <p className="text-muted-foreground text-xs">
        Imports are preview-first. Re-run preview after changing input or options.
      </p>
    </div>
  );
}
