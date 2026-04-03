"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

import InstitutionsCards from "./institutions-cards";
import InstitutionsHeader from "./institutions-header";
import InstitutionsToolbar from "./institutions-toolbar";
import InstitutionsTable from "./institutions-table";
import { filterInstitutions, Institution } from "./institutions.utils";

const PAGE_SIZE = 15;

export default function InstitutionsClient({ institutions }: { institutions: Institution[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(
    () => filterInstitutions(institutions, search, statusFilter),
    [institutions, search, statusFilter],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const paginated = filtered.slice(start, start + PAGE_SIZE);

  function handleSearchChange(value: string) {
    setSearch(value);
    setCurrentPage(1);
  }

  function handleStatusChange(value: string) {
    setStatusFilter(value);
    setCurrentPage(1);
  }

  const showingEnd = Math.min(start + PAGE_SIZE, filtered.length);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <InstitutionsHeader />

      <InstitutionsToolbar
        search={search}
        onSearchChange={handleSearchChange}
        statusFilter={statusFilter}
        onStatusChange={handleStatusChange}
      />

      <InstitutionsCards institutions={paginated} />
      <InstitutionsTable institutions={paginated} />

      {filtered.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-sm">
            Showing {start + 1}–{showingEnd} of {filtered.length}{" "}
            {filtered.length === 1 ? "institution" : "institutions"}
          </p>

          {filtered.length > PAGE_SIZE && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
