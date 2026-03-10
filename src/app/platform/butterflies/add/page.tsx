"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ValidationDetail = {
  path?: string;
  message?: string;
};

type ApiErrorBody = {
  error?: string;
  details?: ValidationDetail[];
};

function parseRangeInput(value: string) {
  return value
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export default function AddSpeciesPage() {
  const router = useRouter();
  const [scientificName, setScientificName] = useState("");
  const [commonName, setCommonName] = useState("");
  const [family, setFamily] = useState("");
  const [subFamily, setSubFamily] = useState("");
  const [lifespanDays, setLifespanDays] = useState("");
  const [rangeInput, setRangeInput] = useState("");
  const [description, setDescription] = useState("");
  const [hostPlant, setHostPlant] = useState("");
  const [habitat, setHabitat] = useState("");
  const [funFacts, setFunFacts] = useState("");
  const [imgWingsOpen, setImgWingsOpen] = useState("");
  const [imgWingsClosed, setImgWingsClosed] = useState("");
  const [extraImg1, setExtraImg1] = useState("");
  const [extraImg2, setExtraImg2] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationMessages, setValidationMessages] = useState<string[]>([]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setValidationMessages([]);

    const lifespan = Number.parseInt(lifespanDays, 10);
    if (!Number.isInteger(lifespan) || lifespan <= 0) {
      setErrorMessage("Lifespan days must be a positive integer.");
      setIsSubmitting(false);
      return;
    }

    const payload = {
      scientific_name: scientificName,
      common_name: commonName,
      family,
      sub_family: subFamily,
      lifespan_days: lifespan,
      range: parseRangeInput(rangeInput),
      description: description.trim() || null,
      host_plant: hostPlant.trim() || null,
      habitat: habitat.trim() || null,
      fun_facts: funFacts.trim() || null,
      img_wings_open: imgWingsOpen.trim() || null,
      img_wings_closed: imgWingsClosed.trim() || null,
      extra_img_1: extraImg1.trim() || null,
      extra_img_2: extraImg2.trim() || null,
    };

    try {
      const response = await fetch("/api/species", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = (await response.json().catch(() => null)) as ApiErrorBody | null;

      if (!response.ok) {
        if (response.status === 409 && body?.error === "Scientific name already in use") {
          setErrorMessage("Scientific name already in use.");
          return;
        }

        if (response.status === 400 && body?.error === "Invalid request" && body.details) {
          const messages = body.details
            .map((detail) => detail.message)
            .filter((message): message is string => Boolean(message));
          setErrorMessage("Please fix the highlighted validation issues.");
          setValidationMessages(messages);
          return;
        }

        setErrorMessage(body?.error ?? "Unable to create species.");
        return;
      }

      router.push("/platform/butterflies");
      router.refresh();
    } catch {
      setErrorMessage("Unable to create species.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">Add Species</h1>
          <p className="text-muted-foreground text-sm">Create a global butterfly species entry.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/platform/butterflies">Back to butterflies</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Species details</CardTitle>
          <CardDescription>Required fields must be provided for creation.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="scientific_name">Scientific Name *</Label>
                <Input
                  id="scientific_name"
                  value={scientificName}
                  onChange={(event) => setScientificName(event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="common_name">Common Name *</Label>
                <Input
                  id="common_name"
                  value={commonName}
                  onChange={(event) => setCommonName(event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="family">Family *</Label>
                <Input
                  id="family"
                  value={family}
                  onChange={(event) => setFamily(event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sub_family">Sub-family *</Label>
                <Input
                  id="sub_family"
                  value={subFamily}
                  onChange={(event) => setSubFamily(event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lifespan_days">Lifespan Days *</Label>
                <Input
                  id="lifespan_days"
                  type="number"
                  min={1}
                  step={1}
                  value={lifespanDays}
                  onChange={(event) => setLifespanDays(event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="range">Range *</Label>
                <Textarea
                  id="range"
                  value={rangeInput}
                  onChange={(event) => setRangeInput(event.target.value)}
                  placeholder="One entry per line, or comma-separated"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">
                  Description <span className="text-muted-foreground text-xs">(Optional)</span>
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="host_plant">
                  Host Plant <span className="text-muted-foreground text-xs">(Optional)</span>
                </Label>
                <Textarea
                  id="host_plant"
                  value={hostPlant}
                  onChange={(event) => setHostPlant(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="habitat">
                  Habitat <span className="text-muted-foreground text-xs">(Optional)</span>
                </Label>
                <Textarea
                  id="habitat"
                  value={habitat}
                  onChange={(event) => setHabitat(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fun_facts">
                  Fun Facts <span className="text-muted-foreground text-xs">(Optional)</span>
                </Label>
                <Textarea
                  id="fun_facts"
                  value={funFacts}
                  onChange={(event) => setFunFacts(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="img_wings_open">
                  Wings Open Image URL{" "}
                  <span className="text-muted-foreground text-xs">(Optional)</span>
                </Label>
                <Input
                  id="img_wings_open"
                  value={imgWingsOpen}
                  onChange={(event) => setImgWingsOpen(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="img_wings_closed">
                  Wings Closed Image URL{" "}
                  <span className="text-muted-foreground text-xs">(Optional)</span>
                </Label>
                <Input
                  id="img_wings_closed"
                  value={imgWingsClosed}
                  onChange={(event) => setImgWingsClosed(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="extra_img_1">
                  Extra Image URL 1{" "}
                  <span className="text-muted-foreground text-xs">(Optional)</span>
                </Label>
                <Input
                  id="extra_img_1"
                  value={extraImg1}
                  onChange={(event) => setExtraImg1(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="extra_img_2">
                  Extra Image URL 2{" "}
                  <span className="text-muted-foreground text-xs">(Optional)</span>
                </Label>
                <Input
                  id="extra_img_2"
                  value={extraImg2}
                  onChange={(event) => setExtraImg2(event.target.value)}
                />
              </div>
            </div>

            {errorMessage ? (
              <div className="text-destructive text-sm" role="status" aria-live="polite">
                {errorMessage}
              </div>
            ) : null}

            {validationMessages.length > 0 ? (
              <ul
                className="text-destructive list-disc space-y-1 pl-5 text-sm"
                role="status"
                aria-live="polite"
              >
                {validationMessages.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            ) : null}

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Species"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
