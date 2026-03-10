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

type InstitutionListItem = {
  id: number;
  name: string;
  slug: string;
};

function getBaseUrl(requestHeaders: Headers) {
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";

  if (!host) return null;
  return `${protocol}://${host}`;
}

export default async function PlatformInstitutionsPage() {
  const requestHeaders = await headers();
  const baseUrl = getBaseUrl(requestHeaders);

  if (!baseUrl) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold">Institutions</h1>
          </div>
          <Button asChild>
            <Link href="/platform/institutions/add">Add Institution</Link>
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Institution list</CardTitle>
            <CardDescription>
              Cross-tenant institutions available for platform testing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">Unable to resolve request host.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const response = await fetch(`${baseUrl}/api/institution/list`, {
    headers: {
      cookie: requestHeaders.get("cookie") ?? "",
    },
    cache: "no-store",
  });

  const institutions = response.ok ? ((await response.json()) as InstitutionListItem[]) : [];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">Institutions</h1>
        </div>
        <Button asChild>
          <Link href="/platform/institutions/add">Add Institution</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Institution list</CardTitle>
          <CardDescription>
            Cross-tenant institutions available for platform testing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!response.ok ? (
            <div className="text-destructive text-sm" role="status" aria-live="polite">
              Unable to load institutions.
            </div>
          ) : institutions.length === 0 ? (
            <div className="text-muted-foreground text-sm" role="status" aria-live="polite">
              No institutions found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {institutions.map((institution) => {
                  const href = `/platform/institutions/${institution.id}`;

                  return (
                    <TableRow key={institution.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={href}
                          className="text-foreground underline-offset-4 hover:underline"
                        >
                          {institution.id}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={href}
                          className="text-foreground underline-offset-4 hover:underline"
                        >
                          {institution.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={href}
                          className="text-foreground underline-offset-4 hover:underline"
                        >
                          {institution.slug}
                        </Link>
                      </TableCell>
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
