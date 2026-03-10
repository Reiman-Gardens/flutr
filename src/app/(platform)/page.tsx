import type { Metadata } from "next";
import { getActiveInstitutions } from "@/lib/queries/platform";
import { InstitutionDirectory } from "@/components/public/root-home/institution-directory";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Flutr — Discover Butterfly Houses",
  description:
    "Explore butterfly houses worldwide. Track live butterfly populations, browse species galleries, and discover conservation efforts near you.",
};

export default async function HomePage() {
  const rows = await getActiveInstitutions();

  return (
    <>
      {/* Tagline */}
      <section className="px-4 pt-10 pb-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Discover Butterfly Houses
          </h1>
          <p className="text-muted-foreground mt-2">
            Explore the world of tropical species and conservation efforts
          </p>
        </div>
      </section>

      {/* Institution directory */}
      <section
        aria-labelledby="directory-heading"
        className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 sm:px-6 lg:px-8"
      >
        <h2 id="directory-heading" className="sr-only">
          Butterfly houses
        </h2>
        <InstitutionDirectory institutions={rows} />
      </section>
    </>
  );
}
