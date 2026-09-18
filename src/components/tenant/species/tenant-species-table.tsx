import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import TenantSpeciesTableRow from "./tenant-species-table-row";
import type { TenantSpeciesSummary } from "./species.utils";

interface TenantSpeciesTableProps {
  species: TenantSpeciesSummary[];
  onEdit: (species: TenantSpeciesSummary) => void;
}

export default function TenantSpeciesTable({ species, onEdit }: TenantSpeciesTableProps) {
  return (
    <Card className="hidden md:block">
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Species</TableHead>
              <TableHead>Common name</TableHead>
              <TableHead>Lifespan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {species.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground py-8 text-center text-sm">
                  No butterfly species found.
                </TableCell>
              </TableRow>
            ) : (
              species.map((item) => (
                <TenantSpeciesTableRow key={item.id} species={item} onEdit={onEdit} />
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
