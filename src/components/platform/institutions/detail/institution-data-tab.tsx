import { Button } from "@/components/ui/button";

export default function InstitutionDataTab() {
  return (
    <div className="mt-6 flex flex-col gap-4">
      <h2 className="text-sm font-semibold">Historical Shipment Data</h2>

      <p className="text-muted-foreground text-sm">
        Superusers can import historical shipment records from Excel files and export current
        institution data for reporting or migration purposes.
      </p>

      <div className="flex gap-2">
        <Button variant="outline" disabled>
          Import from Excel
        </Button>
        <Button variant="outline" disabled>
          Export Data
        </Button>
      </div>

      <p className="text-muted-foreground text-xs">
        Full data tools will be available in the Shipments Hub.
      </p>
    </div>
  );
}
