import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";

import { Card, CardContent } from "@/components/ui/card";

import InstitutionsTableRow from "./institutions-table-row";
import { Institution } from "./institutions.utils";

export default function InstitutionsTable({ institutions }: { institutions: Institution[] }) {
  return (
    <Card>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Institution</TableHead>
              <TableHead>Primary Contact</TableHead>
              <TableHead>Theme</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {institutions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground py-8 text-center text-sm">
                  No institutions found.
                </TableCell>
              </TableRow>
            ) : (
              institutions.map((inst) => <InstitutionsTableRow key={inst.id} institution={inst} />)
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
