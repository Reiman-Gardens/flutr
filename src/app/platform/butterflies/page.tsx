import Link from "next/link";
import { headers } from "next/headers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SpeciesListItem = {
  id: number;
  scientific_name: string;
  common_name: string;
  family: string;
  sub_family: string;
  lifespan_days: number;
};

function getBaseUrl(requestHeaders: Headers) {
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";

  if (!host) return null;
  return `${protocol}://${host}`;
}

export default async function PlatformButterfliesPage() {
  const requestHeaders = await headers();
  const baseUrl = getBaseUrl(requestHeaders);

  if (!baseUrl) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold">Butterflies</h1>
          </div>
          <Button asChild>
            <Link href="/platform/butterflies/add">Add Species</Link>
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Species list</CardTitle>
            <CardDescription>Global species available for platform management.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">Unable to resolve request host.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const response = await fetch(`${baseUrl}/api/species`, {
    headers: {
      cookie: requestHeaders.get("cookie") ?? "",
    },
    cache: "no-store",
  });

  const species = response.ok ? ((await response.json()) as SpeciesListItem[]) : [];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">Butterflies</h1>
        </div>
        <Button asChild>
          <Link href="/platform/butterflies/add">Add Species</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Species list</CardTitle>
          <CardDescription>Global species available for platform management.</CardDescription>
        </CardHeader>
        <CardContent>
          {!response.ok ? (
            <div className="text-destructive text-sm" role="status" aria-live="polite">
              Unable to load species.
            </div>
          ) : species.length === 0 ? (
            <div className="text-muted-foreground text-sm" role="status" aria-live="polite">
              No species found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Scientific Name</TableHead>
                  <TableHead>Common Name</TableHead>
                  <TableHead>Family</TableHead>
                  <TableHead>Sub-family</TableHead>
                  <TableHead>Lifespan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {species.map((item) => {
                  const href = `/platform/butterflies/${item.id}`;

                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={href}
                          className="text-foreground underline-offset-4 hover:underline"
                        >
                          {item.id}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={href}
                          className="text-foreground underline-offset-4 hover:underline"
                        >
                          {item.scientific_name}
                        </Link>
                      </TableCell>
                      <TableCell>{item.common_name}</TableCell>
                      <TableCell>{item.family}</TableCell>
                      <TableCell>{item.sub_family}</TableCell>
                      <TableCell>{item.lifespan_days}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
