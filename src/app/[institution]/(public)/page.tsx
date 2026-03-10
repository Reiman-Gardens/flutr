"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type InstitutionNews = {
  id: number;
  title: string;
  content: string;
  image_url?: string | null;
  created_at: string;
};

type PublicInstitution = {
  id: number;
  slug: string;
  name: string;
  facility_image_url?: string | null;
  description?: string | null;
  latestNews?: InstitutionNews | null;
};

type PublicInstitutionInFlight = {
  scientific_name: string;
  common_name: string;
  image_url?: string | null;
  quantity: number;
};

export default function InstitutionPublicPage() {
  const params = useParams<{ institution: string }>();
  const slug = params?.institution ?? "";

  const [institution, setInstitution] = useState<PublicInstitution | null>(null);
  const [inFlightTotal, setInFlightTotal] = useState(0);
  const [speciesInFlightTotal, setSpeciesInFlightTotal] = useState(0);
  const [statsStatus, setStatsStatus] = useState<"loading" | "ready" | "error">("loading");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const loadInstitution = async () => {
      if (!slug) {
        setStatus("error");
        setStatsStatus("error");
        return;
      }

      setStatus("loading");
      setStatsStatus("loading");
      try {
        const [institutionResponse, inFlightResponse] = await Promise.all([
          fetch(`/api/public/institutions/${encodeURIComponent(slug)}`),
          fetch(`/api/public/institutions/${encodeURIComponent(slug)}/in-flight`),
        ]);

        const [institutionResult, inFlightResult] = await Promise.all([
          institutionResponse.json().catch(() => null),
          inFlightResponse.json().catch(() => null),
        ]);

        if (!institutionResponse.ok || !institutionResult) {
          setStatus("error");
          setStatsStatus("error");
          return;
        }

        setInstitution(institutionResult as PublicInstitution);
        setStatus("ready");

        if (inFlightResponse.ok && Array.isArray(inFlightResult)) {
          const normalized = inFlightResult as PublicInstitutionInFlight[];
          const totalInFlight = normalized.reduce(
            (sum, species) => sum + Number(species.quantity ?? 0),
            0,
          );

          setInFlightTotal(totalInFlight);
          setSpeciesInFlightTotal(normalized.length);
          setStatsStatus("ready");
          return;
        }

        setInFlightTotal(0);
        setSpeciesInFlightTotal(0);
        setStatsStatus("error");
      } catch {
        setStatus("error");
        setStatsStatus("error");
      }
    };

    void loadInstitution();
  }, [slug]);

  const latestNews = useMemo(() => institution?.latestNews ?? null, [institution]);

  if (status === "loading") {
    return (
      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <p className="text-muted-foreground text-sm">Loading institution...</p>
      </main>
    );
  }

  if (status === "error" || !institution) {
    return (
      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <h1 className="text-2xl font-semibold">Institution unavailable</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          We couldn&apos;t load this institution right now.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold">{institution.name}</h1>
        <Link
          href={`/${institution.slug}/gallery`}
          className="hover:bg-muted rounded-md border px-4 py-2 text-sm font-medium transition-colors"
        >
          View Gallery
        </Link>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <section className="rounded-lg border p-4">
            {institution.facility_image_url ? (
              <Image
                src={institution.facility_image_url}
                alt={`${institution.name} facility`}
                width={900}
                height={600}
                className="h-auto w-full rounded-md object-cover"
              />
            ) : (
              <div className="text-muted-foreground text-sm">No facility image available.</div>
            )}
          </section>

          <section aria-live="polite" className="rounded-lg border p-4">
            <h2 className="text-lg font-medium">Stats</h2>
            <dl className="mt-3 space-y-4">
              <div>
                <dt className="text-muted-foreground text-sm">Number In Flight</dt>
                <dd className="text-2xl font-semibold tabular-nums">
                  {statsStatus === "ready" ? inFlightTotal.toLocaleString() : "-"}
                </dd>
              </div>

              <div>
                <dt className="text-muted-foreground text-sm">Species In Flight</dt>
                <dd className="text-2xl font-semibold tabular-nums">
                  {statsStatus === "ready" ? speciesInFlightTotal.toLocaleString() : "-"}
                </dd>
              </div>
            </dl>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-lg border p-4">
            <h2 className="text-lg font-medium">About</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              {institution.description?.trim() || "No description available yet."}
            </p>
          </section>

          <section className="rounded-lg border p-4">
            <h2 className="text-lg font-medium">Latest News</h2>
            {latestNews ? (
              <div className="mt-2 space-y-2">
                <h3 className="font-medium">{latestNews.title}</h3>
                <p className="text-muted-foreground text-sm">{latestNews.content}</p>
                {latestNews.image_url ? (
                  <Image
                    src={latestNews.image_url}
                    alt={`${latestNews.title} image`}
                    width={900}
                    height={600}
                    className="h-auto w-full rounded-md object-cover"
                  />
                ) : null}
              </div>
            ) : (
              <p className="text-muted-foreground mt-2 text-sm">No active news available.</p>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
