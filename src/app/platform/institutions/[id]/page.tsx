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

type InstitutionDetail = {
  id: number;
  slug: string;
  name: string;
  [key: string]: unknown;
};

function getBaseUrl(requestHeaders: Headers) {
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";

  if (!host) return null;
  return `${protocol}://${host}`;
}

function formatFieldValue(value: unknown): string {
  if (value == null) return "null";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  try {
    return JSON.stringify(value);
  } catch {
    return "[unserializable value]";
  }
}

export default async function PlatformInstitutionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const institutionId =
    /^\d+$/.test(rawId) && Number.parseInt(rawId, 10) > 0 ? Number.parseInt(rawId, 10) : null;

  if (!institutionId) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
        <div className="text-destructive text-sm" role="status" aria-live="polite">
          Invalid institution id.
        </div>
      </div>
    );
  }

  const requestHeaders = await headers();
  const baseUrl = getBaseUrl(requestHeaders);

  if (!baseUrl) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
        <div className="text-sm" role="status" aria-live="polite">
          Unable to resolve request host.
        </div>
      </div>
    );
  }

  const response = await fetch(`${baseUrl}/api/institution/${institutionId}`, {
    headers: {
      cookie: requestHeaders.get("cookie") ?? "",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
        <div className="text-destructive text-sm" role="status" aria-live="polite">
          Unable to load institution details.
        </div>
      </div>
    );
  }

  const institution = (await response.json()) as InstitutionDetail;
  const slug = institution.slug;

  const overviewHref = `/platform/institutions/${institution.id}`;
  const profileHref = `/platform/institutions/${institution.id}/profile`;
  const usersHref = `/platform/institutions/${institution.id}/users`;
  const dataHref = `/platform/institutions/${institution.id}/data`;
  const tenantAdminHref = `/${slug}/dashboard`;

  const fieldEntries = Object.entries(institution);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Institution Overview</h1>
        <p className="text-muted-foreground text-sm">Numeric ID: {institution.id}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="secondary">
          <Link href={overviewHref}>Overview</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={profileHref}>Profile</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={usersHref}>Users</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={dataHref}>Data</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={tenantAdminHref}>Open Tenant Admin View</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Institution fields</CardTitle>
          <CardDescription>
            Complete field output from GET /api/institution/{"{id}"}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Field</TableHead>
                <TableHead>Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fieldEntries.map(([field, value]) => (
                <TableRow key={field}>
                  <TableCell className="font-medium">{field}</TableCell>
                  <TableCell className="font-mono text-sm">{formatFieldValue(value)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
