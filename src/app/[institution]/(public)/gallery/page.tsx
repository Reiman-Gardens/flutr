"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type GalleryMode = "all" | "inflight";

type PublicSpecies = {
  scientific_name: string;
  common_name: string;
  image_url: string | null;
  quantity?: number;
};

export default function PublicGalleryPage() {
  const params = useParams<{ institution: string }>();
  const slug = params?.institution ?? "";

  const [mode, setMode] = useState<GalleryMode>("all");
  const [species, setSpecies] = useState<PublicSpecies[]>([]);
  const [inFlightSpecies, setInFlightSpecies] = useState<PublicSpecies[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const loadSpecies = async () => {
      if (!slug) {
        setStatus("error");
        return;
      }

      setStatus("loading");
      try {
        const [speciesResponse, inFlightResponse] = await Promise.all([
          fetch(`/api/public/institutions/${encodeURIComponent(slug)}/species`),
          fetch(`/api/public/institutions/${encodeURIComponent(slug)}/in-flight`),
        ]);

        const [speciesResult, inFlightResult] = await Promise.all([
          speciesResponse.json().catch(() => null),
          inFlightResponse.json().catch(() => null),
        ]);

        if (!speciesResponse.ok || !Array.isArray(speciesResult)) {
          setStatus("error");
          return;
        }

        setSpecies(speciesResult as PublicSpecies[]);

        if (inFlightResponse.ok && Array.isArray(inFlightResult)) {
          const normalizedInFlight = (inFlightResult as PublicSpecies[]).map((item) => ({
            ...item,
            quantity: Number(item.quantity ?? 0),
          }));

          setInFlightSpecies(normalizedInFlight);
        } else {
          setInFlightSpecies([]);
        }

        setStatus("ready");
      } catch {
        setStatus("error");
      }
    };

    void loadSpecies();
  }, [slug]);

  const visibleSpecies = useMemo(
    () => (mode === "inflight" ? inFlightSpecies : species),
    [mode, inFlightSpecies, species],
  );

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-10">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold">Gallery</h1>
        <div className="inline-flex rounded-md border p-1">
          <button
            type="button"
            onClick={() => setMode("all")}
            className={`rounded px-3 py-1 text-sm ${
              mode === "all" ? "bg-muted font-medium" : "text-muted-foreground"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setMode("inflight")}
            className={`rounded px-3 py-1 text-sm ${
              mode === "inflight" ? "bg-muted font-medium" : "text-muted-foreground"
            }`}
          >
            In Flight
          </button>
        </div>
      </header>

      {status === "loading" ? (
        <p className="text-muted-foreground text-sm">Loading species...</p>
      ) : status === "error" ? (
        <p className="text-destructive text-sm">Unable to load species.</p>
      ) : visibleSpecies.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {mode === "inflight" ? "No species currently in flight." : "No species available."}
        </p>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleSpecies.map((item) => (
            <Link
              key={item.scientific_name}
              href={`/${slug}/${encodeURIComponent(item.scientific_name)}`}
              className="rounded-lg border p-3 transition-all hover:-translate-y-0.5 hover:shadow-sm"
            >
              <div className="mb-3 overflow-hidden rounded-md border">
                {item.image_url ? (
                  <Image
                    src={item.image_url}
                    alt={item.common_name}
                    width={500}
                    height={320}
                    className="h-40 w-full object-cover"
                  />
                ) : (
                  <div className="text-muted-foreground flex h-40 items-center justify-center text-sm">
                    No image
                  </div>
                )}
              </div>
              <h2 className="font-medium">{item.common_name}</h2>
              {mode === "inflight" ? (
                <p className="text-muted-foreground mt-1 text-sm">
                  In flight: {item.quantity ?? 0}
                </p>
              ) : (
                <p className="text-muted-foreground mt-1 text-sm italic">{item.scientific_name}</p>
              )}
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
