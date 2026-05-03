"use client";

import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import type { PlatformSupplierSummary } from "./suppliers.utils";

type ApiErrorResponse = {
  error?: {
    message?: string;
  };
};

interface SupplierDeleteDialogProps {
  supplier: PlatformSupplierSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: (supplierId: number) => void;
}

export default function SupplierDeleteDialog({
  supplier,
  open,
  onOpenChange,
  onDeleted,
}: SupplierDeleteDialogProps) {
  async function handleDelete() {
    if (!supplier) {
      return;
    }

    const response = await fetch(`/api/platform/suppliers/${supplier.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as ApiErrorResponse;
      toast.error(body.error?.message ?? "Unable to delete supplier.");
      return;
    }

    onDeleted(supplier.id);
    toast.success("Supplier deleted.");
    onOpenChange(false);
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <AlertTriangle aria-hidden="true" />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete supplier?</AlertDialogTitle>
          <AlertDialogDescription>
            {supplier ? (
              <>
                This will permanently remove <strong>{supplier.name}</strong> from the global
                supplier catalog.
              </>
            ) : (
              "This will permanently remove the selected supplier from the global supplier catalog."
            )}
          </AlertDialogDescription>
          <AlertDialogDescription>
            If the supplier is already referenced by shipments, deletion will be blocked.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleDelete}>
            Delete supplier
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
