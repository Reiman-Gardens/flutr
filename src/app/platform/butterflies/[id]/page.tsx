import Link from "next/link";
import { headers } from "next/headers";
import { Button } from "@/components/ui/button";
import SpeciesEditorClient from "./species-editor-client";

type SpeciesRecord = {
  id: number;
  scientific_name: string;
  common_name: string;
  family: string;
  sub_family: string;
  lifespan_days: number;
  range: string[];
  description: string | null;
  host_plant: string | null;
  habitat: string | null;
  fun_facts: string | null;
  img_wings_open: string | null;
  img_wings_closed: string | null;
  extra_img_1: string | null;
  extra_img_2: string | null;
};

function getBaseUrl(requestHeaders: Headers) {
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";

  if (!host) return null;
  return `${protocol}://${host}`;
}

export default async function PlatformButterflyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const speciesId =
    /^\d+$/.test(rawId) && Number.parseInt(rawId, 10) > 0 ? Number.parseInt(rawId, 10) : null;

  if (!speciesId) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
        <div className="text-destructive text-sm" role="status" aria-live="polite">
          Invalid species id.
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

  const response = await fetch(`${baseUrl}/api/species`, {
    headers: {
      cookie: requestHeaders.get("cookie") ?? "",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
        <div className="text-destructive text-sm" role="status" aria-live="polite">
          Unable to load species details.
        </div>
      </div>
    );
  }

  const speciesList = (await response.json()) as SpeciesRecord[];
  const species = speciesList.find((item) => item.id === speciesId);

  if (!species) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
        <div className="text-destructive text-sm" role="status" aria-live="polite">
          Species not found.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">Species Detail</h1>
          <p className="text-muted-foreground text-sm">ID: {species.id}</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/platform/butterflies">Back to butterflies</Link>
        </Button>
      </div>

      <SpeciesEditorClient species={species} />
    </div>
  );
}
