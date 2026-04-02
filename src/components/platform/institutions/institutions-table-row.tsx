import { Link } from "@/components/ui/link";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { Institution } from "./institutions.utils";

function getStatusVariant(status: string) {
  switch (status) {
    case "ACTIVE":
      return "default";
    case "SUSPENDED":
      return "destructive";
    default:
      return "outline";
  }
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function InstitutionsTableRow({ institution }: { institution: Institution }) {
  const platformHref = `/platform/institutions/${institution.id}`;

  const location = [institution.city, institution.state_province, institution.country]
    .filter(Boolean)
    .join(", ");

  return (
    <TableRow>
      {/* Institution */}
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="size-8">
            <AvatarImage src={institution.logo_url ?? ""} alt="" />
            <AvatarFallback>{getInitials(institution.name)}</AvatarFallback>
          </Avatar>

          <div className="flex flex-col">
            <span className="font-medium">{institution.name}</span>
            <span className="text-muted-foreground text-xs">{location || "—"}</span>
          </div>
        </div>
      </TableCell>

      {/* Contact */}
      <TableCell>{institution.email_address ?? "—"}</TableCell>

      {/* Theme */}
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="bg-muted-foreground/40 h-3 w-3 rounded-full" />
          <span className="text-muted-foreground text-xs">Default</span>
        </div>
      </TableCell>

      {/* Status */}
      <TableCell>
        <Badge variant={getStatusVariant(institution.status)}>{institution.status}</Badge>
      </TableCell>

      {/* Actions */}
      <TableCell>
        <Button size="sm" variant="outline" asChild>
          <Link href={platformHref}>Manage</Link>
        </Button>
      </TableCell>
    </TableRow>
  );
}
