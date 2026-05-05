import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import SuppliersTableRow from "./suppliers-table-row";
import type { PlatformSupplierSummary } from "./suppliers.utils";

interface SuppliersTableProps {
  suppliers: PlatformSupplierSummary[];
  onEdit: (supplier: PlatformSupplierSummary) => void;
  onDelete: (supplier: PlatformSupplierSummary) => void;
}

export default function SuppliersTable({ suppliers, onEdit, onDelete }: SuppliersTableProps) {
  return (
    <Card className="hidden md:block">
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Supplier</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Website</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {suppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground py-8 text-center text-sm">
                  No suppliers found.
                </TableCell>
              </TableRow>
            ) : (
              suppliers.map((supplier) => (
                <SuppliersTableRow
                  key={supplier.id}
                  supplier={supplier}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
