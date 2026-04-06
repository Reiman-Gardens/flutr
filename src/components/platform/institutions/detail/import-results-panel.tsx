"use client";

import { Button } from "@/components/ui/button";
import { type CommitResponse, type PreviewResponse } from "@/lib/shipment-import-utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ImportResultsPanelProps = {
  preview: PreviewResponse | null;
  commitSummary: CommitResponse | null;
  onReset: () => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ImportResultsPanel({
  preview,
  commitSummary,
  onReset,
}: ImportResultsPanelProps) {
  if (!preview && !commitSummary) return null;

  return (
    <>
      {/* Preview result panel */}
      {preview && (
        <div className="space-y-3 rounded-md border p-4">
          <p className="text-sm font-medium">Preview Details</p>

          {preview.row_errors.length > 0 && (
            <div className="space-y-1">
              <p className="text-destructive text-sm font-medium">Row Errors</p>
              <ul className="text-destructive list-disc space-y-1 pl-5 text-xs">
                {preview.row_errors.slice(0, 20).map((rowError) => (
                  <li key={rowError}>{rowError}</li>
                ))}
              </ul>
            </div>
          )}

          {preview.warnings.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-amber-700">Warnings</p>
              <ul className="list-disc space-y-1 pl-5 text-xs text-amber-700">
                {preview.warnings.slice(0, 20).map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {preview.unknown_species.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-amber-700">Unknown Species</p>
              <ul className="list-disc space-y-1 pl-5 text-xs text-amber-700">
                {preview.unknown_species.slice(0, 20).map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </div>
          )}

          {preview.unknown_suppliers.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-amber-700">Unknown Suppliers</p>
              <ul className="list-disc space-y-1 pl-5 text-xs text-amber-700">
                {preview.unknown_suppliers.slice(0, 20).map((code) => (
                  <li key={code}>{code}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-muted-foreground text-xs">
            Preview hash: <span className="font-mono">{preview.preview_hash}</span>
          </p>
        </div>
      )}

      {/* Commit result panel */}
      {commitSummary && (
        <div className="space-y-2 rounded-md border p-4">
          <p className="text-sm font-medium">Import Summary</p>
          <div className="grid gap-2 text-sm md:grid-cols-3">
            <p>Created: {commitSummary.created}</p>
            <p>Failed: {commitSummary.failed}</p>
            <p>Skipped: {commitSummary.skipped}</p>
          </div>

          {commitSummary.warnings.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-amber-700">Import Warnings</p>
              <ul className="list-disc space-y-1 pl-5 text-xs text-amber-700">
                {commitSummary.warnings.slice(0, 20).map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

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

          <Button type="button" variant="outline" size="sm" onClick={onReset}>
            Import another file
          </Button>
        </div>
      )}
    </>
  );
}
