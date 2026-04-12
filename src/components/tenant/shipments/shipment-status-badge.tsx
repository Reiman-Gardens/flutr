import { CheckCircle2, Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";

interface ShipmentStatusBadgeProps {
  remaining: number;
  isCompleted: boolean;
}

/**
 * Compact status badge used in shipment lists. Shows "Completed" when no
 * butterflies remain to release, otherwise the remaining
 * count.
 */
export function ShipmentStatusBadge({ remaining, isCompleted }: ShipmentStatusBadgeProps) {
  if (isCompleted) {
    return (
      <Badge
        variant="secondary"
        className="bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200"
      >
        <CheckCircle2 aria-hidden="true" />
        Completed
      </Badge>
    );
  }

  return (
    <Badge variant="outline">
      <Clock aria-hidden="true" />
      {remaining} remaining
    </Badge>
  );
}
