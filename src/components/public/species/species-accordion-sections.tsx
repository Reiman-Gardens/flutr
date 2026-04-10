"use client";

import { Leaf, Sparkles } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { SpeciesFunFact } from "@/types/butterfly";

interface SpeciesAccordionSectionsProps {
  hostPlant: string | null;
  funFacts: SpeciesFunFact[] | null;
}

export function SpeciesAccordionSections({ hostPlant, funFacts }: SpeciesAccordionSectionsProps) {
  const structuredFunFacts = funFacts ?? [];
  const hasFunFacts = structuredFunFacts.length > 0;

  if (!hostPlant && !hasFunFacts) return null;

  return (
    <Accordion type="multiple" className="w-full">
      {hostPlant && (
        <AccordionItem value="host-plant">
          <AccordionTrigger>
            <span className="flex items-center gap-2">
              <Leaf className="size-4 text-green-600" aria-hidden="true" />
              Host Plant Information
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <p className="text-muted-foreground text-sm leading-relaxed">{hostPlant}</p>
          </AccordionContent>
        </AccordionItem>
      )}

      {hasFunFacts && (
        <AccordionItem value="fun-facts">
          <AccordionTrigger>
            <span className="flex items-center gap-2">
              <Sparkles className="size-4 text-amber-500" aria-hidden="true" />
              Fun Facts
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              {structuredFunFacts.map((funFact, index) => (
                <div key={`${funFact.title}-${index}`} className="space-y-1">
                  <h3 className="text-sm font-medium">{funFact.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{funFact.fact}</p>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      )}
    </Accordion>
  );
}
