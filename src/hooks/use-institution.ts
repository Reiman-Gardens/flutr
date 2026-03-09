import { useParams } from "next/navigation";

export function useInstitution() {
  const params = useParams<{ institution: string }>();
  const slug = params.institution;
  const basePath = `/${slug}`;

  return { slug, basePath };
}
