"use client";

import { useMemo, useState } from "react";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  /** YYYY-MM-DD string. Empty string means "no date selected". */
  value: string;
  onChange: (next: string) => void;
  /** Disable dates after this YYYY-MM-DD (inclusive bound). */
  maxDate?: string;
  /** Disable dates before this YYYY-MM-DD (inclusive bound). */
  minDate?: string;
  disabled?: boolean;
  /** Form id for label association. */
  id?: string;
  placeholder?: string;
  /** Forwarded to the trigger button so the parent form can drive its red state. */
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

const displayFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "2-digit",
  year: "numeric",
});

/** Parse a YYYY-MM-DD string into a JS Date in the user's local timezone. */
function parseDateOnly(value: string): Date | undefined {
  if (!value) return undefined;
  const [y, m, d] = value.split("-").map((part) => Number.parseInt(part, 10));
  if (!y || !m || !d) return undefined;
  // Reject obvious out-of-range values so JS Date doesn't silently overflow
  // (e.g. month 13 → next January).
  if (m < 1 || m > 12 || d < 1 || d > 31) return undefined;
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.valueOf())) return undefined;
  // Final sanity check: catch month/day combinations that JS rolled over
  // (e.g. Feb 30 → Mar 2).
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return undefined;
  }
  return date;
}

/** Format a JS Date back into a YYYY-MM-DD string in the user's timezone. */
function formatDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Specialized date-only picker — popover + react-day-picker calendar.
 *
 * Stores its value as a YYYY-MM-DD string for easy serialization (the same
 * shape the rest of the app uses for shipment dates). The display button
 * shows a friendly weekday/month/day/year string when set.
 */
export function DatePicker({
  value,
  onChange,
  maxDate,
  minDate,
  disabled,
  id,
  placeholder = "Pick a date",
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);

  const selected = useMemo(() => parseDateOnly(value), [value]);
  const minDateObj = useMemo(() => parseDateOnly(minDate ?? ""), [minDate]);
  const maxDateObj = useMemo(() => parseDateOnly(maxDate ?? ""), [maxDate]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
          disabled={disabled}
          className={cn(
            "h-auto w-full justify-between gap-2 px-3 py-2 text-left font-normal",
            !selected && "text-muted-foreground",
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            <CalendarIcon className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
            <span className="truncate text-sm">
              {selected ? displayFormatter.format(selected) : placeholder}
            </span>
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            if (date) {
              onChange(formatDateOnly(date));
              setOpen(false);
            }
          }}
          disabled={(date) => {
            if (minDateObj && date < minDateObj) return true;
            if (maxDateObj && date > maxDateObj) return true;
            return false;
          }}
          // Open on the selected date (or today) when the popover opens.
          defaultMonth={selected ?? new Date()}
          captionLayout="dropdown"
        />
      </PopoverContent>
    </Popover>
  );
}
