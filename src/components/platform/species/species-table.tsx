import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import SpeciesTableRow from "./species-table-row";
import type { PlatformSpeciesSummary } from "./species.utils";

interface SpeciesTableProps {
  species: PlatformSpeciesSummary[];
  onEdit: (speciesId: number) => void;
  onDelete: (species: PlatformSpeciesSummary) => void;
}

export default function SpeciesTable({ species, onEdit, onDelete }: SpeciesTableProps) {
  return (
    <Card className="hidden md:block">
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Species</TableHead>
              <TableHead>Classification</TableHead>
              <TableHead>Lifespan</TableHead>
              <TableHead>Range</TableHead>
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
                <SpeciesTableRow key={item.id} species={item} onEdit={onEdit} onDelete={onDelete} />
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
