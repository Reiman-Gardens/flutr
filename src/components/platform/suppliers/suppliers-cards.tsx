import { Pencil, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import type { PlatformSupplierSummary } from "./suppliers.utils";

interface SuppliersCardsProps {
  suppliers: PlatformSupplierSummary[];
  onEdit: (supplier: PlatformSupplierSummary) => void;
  onDelete: (supplier: PlatformSupplierSummary) => void;
}

export default function SuppliersCards({ suppliers, onEdit, onDelete }: SuppliersCardsProps) {
  if (suppliers.length === 0) {
    return (
      <Card className="md:hidden">
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground text-sm">No suppliers found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4 md:hidden">
      {suppliers.map((supplier) => (
        <Card key={supplier.id}>
          <CardContent className="flex flex-col gap-4 pt-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p className="text-base font-medium break-words">{supplier.name}</p>
                <p className="text-muted-foreground text-sm break-words">{supplier.code}</p>
              </div>
              <Badge variant={supplier.isActive ? "default" : "secondary"}>
                {supplier.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Country
                </p>
                <p className="text-sm">{supplier.country}</p>
              </div>

              <div className="space-y-1">
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Website
                </p>
                {supplier.websiteUrl ? (
                  <p className="truncate text-sm">{supplier.websiteUrl}</p>
                ) : (
                  <p className="text-muted-foreground text-sm">None</p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button className="flex-1" variant="outline" onClick={() => onEdit(supplier)}>
                <Pencil aria-hidden="true" className="size-4" />
                Edit
              </Button>
              <Button className="flex-1" variant="outline" onClick={() => onDelete(supplier)}>
                <Trash2 aria-hidden="true" className="size-4" />
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
