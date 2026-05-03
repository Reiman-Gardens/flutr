import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

interface SuppliersHeaderProps {
  activeSuppliers: number;
  totalSuppliers: number;
  onAddSupplier: () => void;
}

export default function SuppliersHeader({
  activeSuppliers,
  totalSuppliers,
  onAddSupplier,
}: SuppliersHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold">Suppliers</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage the global supplier catalog used by shipment imports and tenant records.
        </p>
        <p className="text-muted-foreground mt-2 text-sm">
          {activeSuppliers} active of {totalSuppliers} total suppliers
        </p>
      </div>

      <Button onClick={onAddSupplier}>
        <Plus aria-hidden="true" className="size-4" />
        Add Supplier
      </Button>
    </div>
  );
}
