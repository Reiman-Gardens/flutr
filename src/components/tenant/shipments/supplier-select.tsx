"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Warehouse } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { type SupplierOption } from "@/components/tenant/shipments/supplier-options";
import { cn } from "@/lib/utils";

export {
  mapSupplierRowsToOptions,
  type SupplierOption,
} from "@/components/tenant/shipments/supplier-options";

interface SupplierSelectProps {
  /** Supplier list, typically loaded from /api/tenant/suppliers. */
  suppliers: SupplierOption[];
  /** Currently selected supplier code (matches `SupplierOption.code`). */
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  /** Field id for label association. */
  id?: string;
  placeholder?: string;
  /** Forwarded to the trigger button so the parent form can drive its red state. */
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

/**
 * Specialized supplier picker — popover + Command palette with search across
 * code and name. Shows active suppliers first, then inactive ones grouped
 * separately with a muted style. The trigger button doubles as the form
 * control and renders the picked supplier's code + name.
 */
export function SupplierSelect({
  suppliers,
  value,
  onChange,
  disabled,
  id,
  placeholder = "Select a supplier",
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: SupplierSelectProps) {
  const [open, setOpen] = useState(false);

  const { active, inactive } = useMemo(() => {
    const a: SupplierOption[] = [];
    const i: SupplierOption[] = [];
    for (const supplier of suppliers) {
      (supplier.isActive ? a : i).push(supplier);
    }
    a.sort((x, y) => x.code.localeCompare(y.code));
    i.sort((x, y) => x.code.localeCompare(y.code));
    return { active: a, inactive: i };
  }, [suppliers]);

  const selected = useMemo(
    () => suppliers.find((supplier) => supplier.code === value) ?? null,
    [suppliers, value],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
          disabled={disabled}
          className={cn(
            "h-auto w-full justify-between gap-2 px-3 py-2 text-left font-normal",
            !selected && "text-muted-foreground",
          )}
        >
          {selected ? (
            <span className="flex min-w-0 items-center gap-2">
              <Warehouse className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{selected.code}</span>
                <span className="text-muted-foreground block truncate text-xs">
                  {selected.name}
                  {!selected.isActive && " · inactive"}
                </span>
              </span>
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Warehouse className="size-4 shrink-0" aria-hidden="true" />
              {placeholder}
            </span>
          )}
          <ChevronsUpDown className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search by code or name…" />
          <CommandList>
            <CommandEmpty>No suppliers match.</CommandEmpty>
            {active.length > 0 && (
              <CommandGroup heading="Active">
                {active.map((supplier) => (
                  <SupplierCommandItem
                    key={supplier.id}
                    supplier={supplier}
                    selected={selected?.code === supplier.code}
                    onSelect={() => {
                      onChange(supplier.code);
                      setOpen(false);
                    }}
                  />
                ))}
              </CommandGroup>
            )}
            {inactive.length > 0 && (
              <CommandGroup heading="Inactive">
                {inactive.map((supplier) => (
                  <SupplierCommandItem
                    key={supplier.id}
                    supplier={supplier}
                    selected={selected?.code === supplier.code}
                    muted
                    onSelect={() => {
                      onChange(supplier.code);
                      setOpen(false);
                    }}
                  />
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface SupplierCommandItemProps {
  supplier: SupplierOption;
  selected: boolean;
  muted?: boolean;
  onSelect: () => void;
}

function SupplierCommandItem({ supplier, selected, muted, onSelect }: SupplierCommandItemProps) {
  return (
    <CommandItem
      // Command's filter matches against the `value` prop, so combine the
      // searchable fields here.
      value={`${supplier.code} ${supplier.name}`}
      onSelect={onSelect}
      className={cn("gap-2", muted && "opacity-70")}
    >
      <Check
        className={cn("size-4 shrink-0", selected ? "opacity-100" : "opacity-0")}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{supplier.code}</div>
        <div className="text-muted-foreground truncate text-xs">{supplier.name}</div>
      </div>
    </CommandItem>
  );
}
