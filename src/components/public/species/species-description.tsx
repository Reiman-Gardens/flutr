import { TreePine } from "lucide-react";

interface SpeciesDescriptionProps {
  description: string | null;
  habitat: string | null;
}

function tryParseJSON(value: string | null): string | null {
  if (!value) return null;

  const trimmed = value.trim();

  // Check if it looks like JSON (starts with {, [, or ")
  if (trimmed.startsWith("{") || trimmed.startsWith("[") || trimmed.startsWith('"')) {
    try {
      const parsed = JSON.parse(trimmed);
      return typeof parsed === "string" ? parsed : value;
    } catch {
      return value;
    }
  }

  return value;
}

export function SpeciesDescription({ description, habitat }: SpeciesDescriptionProps) {
  const parsedDescription = tryParseJSON(description);
  const parsedHabitat = tryParseJSON(habitat);

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
