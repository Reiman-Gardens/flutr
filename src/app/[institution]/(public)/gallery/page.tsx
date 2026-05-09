import type { Metadata } from "next";

import { getPublicInstitution } from "@/lib/queries/institution";
import { getGalleryData, getGalleryGlobalSpecies } from "@/lib/queries/gallery";
import { GalleryHeader } from "@/components/public/gallery/gallery-header";
import { GalleryContent } from "@/components/public/gallery/gallery-content";
import { CuratorsNote } from "@/components/public/gallery/curators-note";

interface GalleryPageProps {
  params: Promise<{ institution: string }>;
}

export async function generateMetadata({ params }: GalleryPageProps): Promise<Metadata> {
  const { institution: slug } = await params;
  const inst = await getPublicInstitution(slug);
  return {
    title: inst ? `Species Gallery — ${inst.name}` : "Species Gallery",
  };
}

export default async function GalleryPage({ params }: GalleryPageProps) {
  const { institution: slug } = await params;

  const inst = (await getPublicInstitution(slug))!;

  const [{ species }, globalSpecies] = await Promise.all([
    getGalleryData(inst.id),
    getGalleryGlobalSpecies(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <GalleryHeader />
      <GalleryContent slug={slug} species={species} globalSpecies={globalSpecies} />
      <CuratorsNote />
    </div>
  );
}
