import { Pencil, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";

import type { PlatformSupplierSummary } from "./suppliers.utils";

interface SuppliersTableRowProps {
  supplier: PlatformSupplierSummary;
  onEdit: (supplier: PlatformSupplierSummary) => void;
  onDelete: (supplier: PlatformSupplierSummary) => void;
}

export default function SuppliersTableRow({ supplier, onEdit, onDelete }: SuppliersTableRowProps) {
  return (
    <TableRow>
      <TableCell className="max-w-[18rem]">
        <div className="flex flex-col">
          <span className="font-medium break-words whitespace-normal">{supplier.name}</span>
          <span className="text-muted-foreground text-xs break-words whitespace-normal">
            {supplier.code}
          </span>
        </div>
      </TableCell>

      <TableCell>{supplier.country}</TableCell>

      <TableCell>
        <Badge variant={supplier.isActive ? "default" : "secondary"}>
          {supplier.isActive ? "Active" : "Inactive"}
        </Badge>
      </TableCell>

      <TableCell className="max-w-[16rem]">
        {supplier.websiteUrl ? (
          <span className="block truncate text-sm">{supplier.websiteUrl}</span>
        ) : (
          <span className="text-muted-foreground text-sm">None</span>
        )}
      </TableCell>

      <TableCell className="w-[1%] whitespace-nowrap">
        <div className="flex items-center justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => onEdit(supplier)}>
            <Pencil aria-hidden="true" className="size-4" />
            Edit
          </Button>
          <Button size="sm" variant="outline" onClick={() => onDelete(supplier)}>
            <Trash2 aria-hidden="true" className="size-4" />
            Delete
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
