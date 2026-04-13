import { Sparkles } from "lucide-react";
import type { SpeciesFunFact } from "@/types/butterfly";

interface FunFactsDisplayProps {
  funFacts: SpeciesFunFact[] | null | string;
}

export function FunFactsDisplay({ funFacts }: FunFactsDisplayProps) {
  // Normalize fun facts: handle array, string (legacy JSON), or null
  let parsedFunFacts: SpeciesFunFact[] | null = null;

  if (funFacts) {
    if (typeof funFacts === "string") {
      // Handle legacy JSON-encoded string (arrays or quoted strings)
      try {
        const trimmed = funFacts.trim();
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          parsedFunFacts = parsed;
        } else if (typeof parsed === "string") {
          // Double-encoded string; try parsing again
          try {
            const reparsed = JSON.parse(parsed);
            if (Array.isArray(reparsed)) {
              parsedFunFacts = reparsed;
            }
          } catch {
            // Keep as-is
          }
        }
      } catch {
        // Not valid JSON; ignore
      }
    } else if (Array.isArray(funFacts)) {
      parsedFunFacts = funFacts;
    }
  }

  // Filter out empty/null facts and ensure structure is valid
  const validFunFacts =
    parsedFunFacts?.filter(
      (fact): fact is SpeciesFunFact =>
        typeof fact === "object" &&
        fact !== null &&
        typeof (fact as unknown as SpeciesFunFact).title === "string" &&
        typeof (fact as unknown as SpeciesFunFact).fact === "string" &&
        ((fact as unknown as SpeciesFunFact).title as string).trim() !== "" &&
        ((fact as unknown as SpeciesFunFact).fact as string).trim() !== "",
    ) ?? [];

  if (validFunFacts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="size-5 text-amber-500" aria-hidden="true" />
        <h3 className="text-base font-semibold">Fun Facts</h3>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {validFunFacts.map((fact, index) => (
          <div
            key={`${fact.title}-${index}`}
            className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950"
          >
            <h4 className="text-sm font-medium text-amber-900 dark:text-amber-100">{fact.title}</h4>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{fact.fact}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
