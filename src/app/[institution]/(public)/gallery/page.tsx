import { getPublicInstitution } from "@/lib/queries/institution";
import { getGalleryData } from "@/lib/queries/gallery";
import { GalleryHeader } from "@/components/public/gallery/gallery-header";
import { GalleryContent } from "@/components/public/gallery/gallery-content";
import { CuratorsNote } from "@/components/public/gallery/curators-note";

interface GalleryPageProps {
  params: Promise<{ institution: string }>;
}

export default async function GalleryPage({ params }: GalleryPageProps) {
  const { institution: slug } = await params;

  // Layout already validates institution exists and calls notFound().
  // This call is deduped by React cache().
  const inst = (await getPublicInstitution(slug))!;

  const { species } = await getGalleryData(inst.id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <GalleryHeader />
      <GalleryContent slug={slug} species={species} />
      <CuratorsNote />
    </div>
  );
}
