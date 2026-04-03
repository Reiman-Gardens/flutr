"use client";

import { Leaf } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface SpeciesAccordionSectionsProps {
  hostPlant: string | null;
}

export function SpeciesAccordionSections({ hostPlant }: SpeciesAccordionSectionsProps) {
  if (!hostPlant) return null;

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
    </Accordion>
  );
}
