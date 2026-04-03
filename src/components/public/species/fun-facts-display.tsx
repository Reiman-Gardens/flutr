"use client";

import { Sparkles } from "lucide-react";
import type { FunFact } from "@/lib/queries/species-detail";

interface FunFactsDisplayProps {
  funFacts: FunFact[] | null;
}

export function FunFactsDisplay({ funFacts }: FunFactsDisplayProps) {
  // Handle cases where funFacts might be a JSON string, null, or not an array
  let parsedFunFacts: typeof funFacts = null;

  if (funFacts) {
    if (typeof funFacts === "string") {
      try {
        parsedFunFacts = JSON.parse(funFacts);
      } catch {
        return null;
      }
    } else if (Array.isArray(funFacts)) {
      parsedFunFacts = funFacts;
    }
  }

  if (!parsedFunFacts || !Array.isArray(parsedFunFacts) || parsedFunFacts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="size-5 text-amber-500" aria-hidden="true" />
        <h3 className="text-base font-semibold">Fun Facts</h3>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {parsedFunFacts.map((fact, index) => (
          <div
            key={index}
            className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950"
          >
            <h4 className="text-sm font-medium text-amber-900 dark:text-amber-100">{fact.title}</h4>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{fact.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
