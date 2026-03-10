import Link from "next/link";
import { headers } from "next/headers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import UsersTableClient from "./users-table-client";

type InstitutionDetail = {
  id: number;
  slug: string;
  name: string;
};

type InstitutionUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  institutionId: number;
};

function getBaseUrl(requestHeaders: Headers) {
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";

  if (!host) return null;
  return `${protocol}://${host}`;
}

export default async function PlatformInstitutionUsersPage({
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

  const commonFetchOptions: RequestInit = {
    headers: {
      cookie: requestHeaders.get("cookie") ?? "",
    },
    cache: "no-store",
  };

  const institutionResponse = await fetch(
    `${baseUrl}/api/institution/${institutionId}`,
    commonFetchOptions,
  );
  if (!institutionResponse.ok) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
        <div className="text-destructive text-sm" role="status" aria-live="polite">
          Unable to load institution details.
        </div>
      </div>
    );
  }

  const institution = (await institutionResponse.json()) as InstitutionDetail;

  const usersResponse = await fetch(
    `${baseUrl}/api/users?institutionId=${institutionId}`,
    commonFetchOptions,
  );

  if (!usersResponse.ok) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
        <div className="text-destructive text-sm" role="status" aria-live="polite">
          Unable to load users.
        </div>
      </div>
    );
  }

  const institutionUsers = (await usersResponse.json()) as InstitutionUser[];

  const overviewHref = `/platform/institutions/${institution.id}`;
  const profileHref = `/platform/institutions/${institution.id}/profile`;
  const usersHref = `/platform/institutions/${institution.id}/users`;
  const dataHref = `/platform/institutions/${institution.id}/data`;
  const tenantAdminHref = `/${institution.slug}/dashboard`;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Institution Users</h1>
        <p className="text-muted-foreground text-sm">Institution ID: {institution.id}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline">
          <Link href={overviewHref}>Overview</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={profileHref}>Profile</Link>
        </Button>
        <Button asChild variant="secondary">
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
          <CardTitle>Users</CardTitle>
          <CardDescription>Users scoped to institution {institution.id}.</CardDescription>
        </CardHeader>
        <CardContent>
          <UsersTableClient initialUsers={institutionUsers} institutionId={institution.id} />
        </CardContent>
      </Card>
    </div>
  );
}
