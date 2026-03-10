"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { useParams } from "next/navigation";

type SpeciesDetail = {
  scientific_name: string;
  common_name: string;
  family: string | null;
  sub_family: string | null;
  lifespan_days: number;
  description: string | null;
  host_plant?: string | null;
  fun_facts?: string | null;
  images?: string[];
  image_url?: string | null;
  img_wings_open?: string | null;
  img_wings_closed?: string | null;
  extra_img_1?: string | null;
  extra_img_2?: string | null;
};

function extractImages(species: SpeciesDetail | null) {
  if (!species) return [] as string[];

  if (Array.isArray(species.images) && species.images.length > 0) {
    return species.images.filter(
      (value): value is string => typeof value === "string" && value.length > 0,
    );
  }

  const candidates = [
    species.img_wings_open,
    species.img_wings_closed,
    species.extra_img_1,
    species.extra_img_2,
    species.image_url,
  ].filter((value): value is string => typeof value === "string" && value.length > 0);

  return Array.from(new Set(candidates));
}

export default function ButterflyPage() {
  const params = useParams<{ institution: string; butterfly: string }>();
  const institution = params?.institution ?? "";
  const butterfly = params?.butterfly ?? "";
  const butterflyScientificName = useMemo(() => {
    try {
      return decodeURIComponent(butterfly);
    } catch {
      return butterfly;
    }
  }, [butterfly]);

  const [status, setStatus] = useState<"loading" | "ready" | "not-found" | "error">("loading");
  const [species, setSpecies] = useState<SpeciesDetail | null>(null);
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    const loadSpecies = async () => {
      if (!institution || !butterflyScientificName) {
        setStatus("error");
        return;
      }

      setStatus("loading");
      try {
        const response = await fetch(
          `/api/public/institutions/${encodeURIComponent(institution)}/species/${encodeURIComponent(
            butterflyScientificName,
          )}`,
        );
        const result = await response.json().catch(() => null);

        if (response.status === 404) {
          setStatus("not-found");
          return;
        }

        if (!response.ok || !result) {
          setStatus("error");
          return;
        }

        setSpecies(result as SpeciesDetail);
        setImageIndex(0);
        setStatus("ready");
      } catch {
        setStatus("error");
      }
    };

    void loadSpecies();
  }, [institution, butterflyScientificName]);

  const images = useMemo(() => extractImages(species), [species]);

  if (status === "loading") {
    return (
      <main className="mx-auto w-full max-w-5xl px-6 py-10">
        <p className="text-muted-foreground text-sm">Loading species detail...</p>
      </main>
    );
  }

  if (status === "not-found") {
    return (
      <main className="mx-auto w-full max-w-5xl space-y-4 px-6 py-10">
        <h1 className="text-2xl font-semibold">Not found</h1>
        <p className="text-muted-foreground text-sm">
          This butterfly is not available for this institution.
        </p>
        <Link
          href={`/${institution}/gallery`}
          className="inline-flex rounded-md border px-4 py-2 text-sm font-medium"
        >
          Back to Gallery
        </Link>
      </main>
    );
  }

  if (status === "error" || !species) {
    return (
      <main className="mx-auto w-full max-w-5xl space-y-4 px-6 py-10">
        <h1 className="text-2xl font-semibold">Unable to load butterfly</h1>
        <p className="text-muted-foreground text-sm">Please try again.</p>
        <Link
          href={`/${institution}/gallery`}
          className="inline-flex rounded-md border px-4 py-2 text-sm font-medium"
        >
          Back to Gallery
        </Link>
      </main>
    );
  }

  const canCycle = images.length > 1;

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold">{species.common_name}</h1>
        <Link
          href={`/${institution}/gallery`}
          className="rounded-md border px-4 py-2 text-sm font-medium"
        >
          Back to Gallery
        </Link>
      </div>

      <section className="rounded-lg border p-4">
        {images.length > 0 ? (
          <div className="space-y-3">
            <div className="relative overflow-hidden rounded-md">
              <Image
                src={images[imageIndex]}
                alt={species.common_name}
                width={1000}
                height={650}
                className="h-auto w-full object-cover"
              />
              {canCycle ? (
                <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
                  {images.map((_, index) => (
                    <span
                      key={`${species.scientific_name}-${index}`}
                      className={`h-2 w-2 rounded-full ${
                        index === imageIndex ? "bg-white" : "bg-white/50"
                      }`}
                    />
                  ))}
                </div>
              ) : null}
            </div>
            {canCycle ? (
              <div className="flex justify-between">
                <button
                  type="button"
                  className="rounded-md border px-3 py-1 text-sm"
                  onClick={() =>
                    setImageIndex((current) => (current === 0 ? images.length - 1 : current - 1))
                  }
                >
                  ←
                </button>
                <button
                  type="button"
                  className="rounded-md border px-3 py-1 text-sm"
                  onClick={() =>
                    setImageIndex((current) => (current === images.length - 1 ? 0 : current + 1))
                  }
                >
                  →
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="text-muted-foreground text-sm">No image available.</div>
        )}
      </section>

      <section className="rounded-lg border p-4">
        <p className="text-sm">
          <span className="font-medium">Common name:</span> {species.common_name}
        </p>
        <p className="text-muted-foreground mt-1 text-sm italic">{species.scientific_name}</p>
        <div className="mt-3 grid gap-2 text-sm">
          <p>
            <span className="font-medium">Family:</span> {species.family ?? "-"}
          </p>
          <p>
            <span className="font-medium">Sub-family:</span> {species.sub_family ?? "-"}
          </p>
          <p>
            <span className="font-medium">Lifespan (days):</span> {species.lifespan_days}
          </p>
          {species.host_plant ? (
            <p>
              <span className="font-medium">Host plant:</span> {species.host_plant}
            </p>
          ) : null}
          {species.description ? (
            <p>
              <span className="font-medium">Description:</span> {species.description}
            </p>
          ) : null}
          {species.fun_facts ? (
            <p>
              <span className="font-medium">Fun facts:</span> {species.fun_facts}
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
