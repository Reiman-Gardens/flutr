import { Leaf } from "lucide-react";

export function CuratorsNote() {
  return (
    <div role="note" className="bg-muted/50 mt-8 flex gap-3 rounded-xl border p-4">
      <div className="text-primary mt-0.5 shrink-0">
        <Leaf className="size-5" aria-hidden="true" />
      </div>
      <div>
        <p className="text-sm font-semibold">Curator&apos;s Note</p>
        <p className="text-muted-foreground mt-1 text-sm">
          The species list is updated daily based on active flight shipments. High humidity might
          reduce visibility in the early morning.
        </p>
      </div>
    </div>
  );
}
