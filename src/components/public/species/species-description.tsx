import { TreePine } from "lucide-react";

interface SpeciesDescriptionProps {
  description: string | null;
  habitat: string | null;
}

export function SpeciesDescription({ description, habitat }: SpeciesDescriptionProps) {
  if (!description && !habitat) return null;

  return (
    <section aria-labelledby="about-heading">
      <h2 id="about-heading" className="text-lg font-bold">
        <TreePine className="mr-1.5 mb-0.5 inline-block size-5" aria-hidden="true" />
        Habitat & Behavior
      </h2>

      {habitat && <p className="text-muted-foreground mt-3 text-sm leading-relaxed">{habitat}</p>}
      {description && (
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">{description}</p>
      )}
    </section>
  );
}
