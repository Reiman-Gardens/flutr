"use client";

import { Package } from "lucide-react";
import { startTransition, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

import SupplierDeleteDialog from "./supplier-delete-dialog";
import SupplierFormDialog from "./supplier-form-dialog";
import SuppliersCards from "./suppliers-cards";
import SuppliersHeader from "./suppliers-header";
import SuppliersTable from "./suppliers-table";
import SuppliersToolbar from "./suppliers-toolbar";
import {
  filterSuppliers,
  toPlatformSupplierSummary,
  type PlatformSupplierRecord,
  type PlatformSupplierSummary,
} from "./suppliers.utils";

const PAGE_SIZE = 15;

interface SuppliersClientProps {
  suppliers: PlatformSupplierSummary[];
}

export default function SuppliersClient({ suppliers: initialSuppliers }: SuppliersClientProps) {
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<PlatformSupplierSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PlatformSupplierSummary | null>(null);

  const filteredSuppliers = useMemo(
    () => filterSuppliers(suppliers, search, showInactive),
    [search, showInactive, suppliers],
  );

  const totalPages = Math.max(1, Math.ceil(filteredSuppliers.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const paginatedSuppliers = filteredSuppliers.slice(start, start + PAGE_SIZE);
  const showingEnd = Math.min(start + PAGE_SIZE, filteredSuppliers.length);
  const activeSupplierCount = suppliers.filter((supplier) => supplier.isActive).length;

  function handleSearchChange(value: string) {
    setSearch(value);
    setCurrentPage(1);
  }

  function handleShowInactiveChange(value: boolean) {
    setShowInactive(value);
    setCurrentPage(1);
  }

  function handleAddSupplier() {
    setEditingSupplier(null);
    setFormOpen(true);
  }

  function handleEditSupplier(supplier: PlatformSupplierSummary) {
    setEditingSupplier(supplier);
    setFormOpen(true);
  }

  function handleSupplierSaved(record: PlatformSupplierRecord, mode: "create" | "edit") {
    const summary = toPlatformSupplierSummary(record);

    startTransition(() => {
      setSuppliers((current) => {
        if (mode === "create") {
          return [...current, summary];
        }

        return current.map((supplier) => (supplier.id === summary.id ? summary : supplier));
      });
      setCurrentPage(1);
    });
  }

  function handleSupplierDeleted(supplierId: number) {
    startTransition(() => {
      setSuppliers((current) => current.filter((supplier) => supplier.id !== supplierId));
      setCurrentPage(1);
    });
    setDeleteTarget(null);
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <SuppliersHeader
        activeSuppliers={activeSupplierCount}
        totalSuppliers={suppliers.length}
        onAddSupplier={handleAddSupplier}
      />

      <SuppliersToolbar
        search={search}
        onSearchChange={handleSearchChange}
        showInactive={showInactive}
        onShowInactiveChange={handleShowInactiveChange}
      />

      {suppliers.length === 0 ? (
        <Card>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Package aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>No suppliers yet</EmptyTitle>
              <EmptyDescription>
                Add the first supplier record to support shipment imports and tracking.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={handleAddSupplier}>Add Supplier</Button>
            </EmptyContent>
          </Empty>
        </Card>
      ) : filteredSuppliers.length === 0 ? (
        <Card>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Package aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>No matching suppliers</EmptyTitle>
              <EmptyDescription>
                Try a different search term or show inactive suppliers.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </Card>
      ) : (
        <>
          <SuppliersCards
            suppliers={paginatedSuppliers}
            onEdit={handleEditSupplier}
            onDelete={setDeleteTarget}
          />
          <SuppliersTable
            suppliers={paginatedSuppliers}
            onEdit={handleEditSupplier}
            onDelete={setDeleteTarget}
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground text-sm">
              Showing {start + 1}-{showingEnd} of {filteredSuppliers.length}{" "}
              {filteredSuppliers.length === 1 ? "supplier" : "suppliers"}
            </p>

            {filteredSuppliers.length > PAGE_SIZE && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={safePage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={safePage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      <SupplierFormDialog
        key={editingSupplier?.id ?? "create"}
        open={formOpen}
        onOpenChange={setFormOpen}
        supplier={editingSupplier}
        onSaved={handleSupplierSaved}
      />

      <SupplierDeleteDialog
        supplier={deleteTarget}
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        onDeleted={handleSupplierDeleted}
      />
    </div>
  );
}
