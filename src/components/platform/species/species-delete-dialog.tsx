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

import type { PlatformSpeciesSummary } from "./species.utils";

type ApiErrorResponse = {
  error?: {
    message?: string;
  };
};

interface SpeciesDeleteDialogProps {
  species: PlatformSpeciesSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: (speciesId: number) => void;
}

export default function SpeciesDeleteDialog({
  species,
  open,
  onOpenChange,
  onDeleted,
}: SpeciesDeleteDialogProps) {
  async function handleDelete() {
    if (!species) {
      return;
    }

    const response = await fetch(`/api/platform/species/${species.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as ApiErrorResponse;
      toast.error(body.error?.message ?? "Unable to delete species.");
      return;
    }

    onDeleted(species.id);
    toast.success("Species deleted.");
    onOpenChange(false);
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <AlertTriangle aria-hidden="true" />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete butterfly species?</AlertDialogTitle>
          <AlertDialogDescription>
            {species ? (
              <>
                This will permanently remove <strong>{species.commonName}</strong> from the global
                catalog.
              </>
            ) : (
              "This will permanently remove the selected species from the global catalog."
            )}
          </AlertDialogDescription>
          <AlertDialogDescription>
            If the species is already referenced by tenant records, shipments, or releases, the
            deletion will be blocked.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleDelete}>
            Delete species
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
