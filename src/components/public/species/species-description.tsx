import { TreePine } from "lucide-react";

interface SpeciesDescriptionProps {
  description: string | null;
  habitat: string | null;
}

export function SpeciesDescription({ description, habitat }: SpeciesDescriptionProps) {
  // Safely parse description if it's a JSON string
  let parsedDescription = description;
  if (description && typeof description === "string" && description.startsWith("{")) {
    try {
      const parsed = JSON.parse(description);
      parsedDescription = typeof parsed === "string" ? parsed : description;
    } catch {
      // Keep original if parsing fails
      parsedDescription = description;
    }
  }

  // Safely parse habitat if it's a JSON string
  let parsedHabitat = habitat;
  if (habitat && typeof habitat === "string" && habitat.startsWith("{")) {
    try {
      const parsed = JSON.parse(habitat);
      parsedHabitat = typeof parsed === "string" ? parsed : habitat;
    } catch {
      // Keep original if parsing fails
      parsedHabitat = habitat;
    }
  }

  if (!parsedDescription && !parsedHabitat) return null;

  return (
    <section aria-labelledby="about-heading">
      <h2 id="about-heading" className="text-lg font-bold">
        <TreePine className="mr-1.5 mb-0.5 inline-block size-5" aria-hidden="true" />
        Habitat & Behavior
      </h2>

      {parsedHabitat && (
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">{parsedHabitat}</p>
      )}
      {parsedDescription && (
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">{parsedDescription}</p>
      )}
    </section>
  );
}
