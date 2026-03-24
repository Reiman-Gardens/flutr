"use client";

import { Leaf, Sparkles } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface SpeciesAccordionSectionsProps {
  hostPlant: string | null;
  funFacts: string | null;
}

export function SpeciesAccordionSections({ hostPlant, funFacts }: SpeciesAccordionSectionsProps) {
  if (!hostPlant && !funFacts) return null;

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

      {funFacts && (
        <AccordionItem value="fun-facts">
          <AccordionTrigger>
            <span className="flex items-center gap-2">
              <Sparkles className="size-4 text-amber-500" aria-hidden="true" />
              Fun Facts
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              {funFacts.split(/\n\n+/).map((paragraph, i) => (
                <p key={i} className="text-muted-foreground text-sm leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      )}
    </Accordion>
  );
}
