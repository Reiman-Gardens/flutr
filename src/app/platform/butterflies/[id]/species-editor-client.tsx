"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type SpeciesRecord = {
  id: number;
  scientific_name: string;
  common_name: string;
  family: string;
  sub_family: string;
  lifespan_days: number;
  range: string[];
  description: string | null;
  host_plant: string | null;
  habitat: string | null;
  fun_facts: string | null;
  img_wings_open: string | null;
  img_wings_closed: string | null;
  extra_img_1: string | null;
  extra_img_2: string | null;
};

type ValidationDetail = {
  path?: string;
  message?: string;
};

type ApiErrorBody = {
  error?: string;
  details?: ValidationDetail[];
};

type SpeciesEditorClientProps = {
  species: SpeciesRecord;
};

function parseRangeInput(value: string) {
  return value
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export default function SpeciesEditorClient({ species }: SpeciesEditorClientProps) {
  const router = useRouter();
  const [scientificName, setScientificName] = useState(species.scientific_name);
  const [commonName, setCommonName] = useState(species.common_name);
  const [family, setFamily] = useState(species.family);
  const [subFamily, setSubFamily] = useState(species.sub_family);
  const [lifespanDays, setLifespanDays] = useState(String(species.lifespan_days));
  const [rangeInput, setRangeInput] = useState(species.range.join("\n"));
  const [description, setDescription] = useState(species.description ?? "");
  const [hostPlant, setHostPlant] = useState(species.host_plant ?? "");
  const [habitat, setHabitat] = useState(species.habitat ?? "");
  const [funFacts, setFunFacts] = useState(species.fun_facts ?? "");
  const [imgWingsOpen, setImgWingsOpen] = useState(species.img_wings_open ?? "");
  const [imgWingsClosed, setImgWingsClosed] = useState(species.img_wings_closed ?? "");
  const [extraImg1, setExtraImg1] = useState(species.extra_img_1 ?? "");
  const [extraImg2, setExtraImg2] = useState(species.extra_img_2 ?? "");

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [validationMessages, setValidationMessages] = useState<string[]>([]);

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);
    setValidationMessages([]);

    const lifespan = Number.parseInt(lifespanDays, 10);
    if (!Number.isInteger(lifespan) || lifespan <= 0) {
      setStatusMessage("Lifespan days must be a positive integer.");
      setIsSaving(false);
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
      const response = await fetch(`/api/species/${species.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = (await response.json().catch(() => null)) as ApiErrorBody | null;

      if (!response.ok) {
        if (response.status === 409 && body?.error === "Scientific name already in use") {
          setStatusMessage("Scientific name already in use.");
          return;
        }

        if (response.status === 400 && body?.error === "Invalid request" && body.details) {
          const messages = body.details
            .map((detail) => detail.message)
            .filter((message): message is string => Boolean(message));
          setStatusMessage("Please fix the highlighted validation issues.");
          setValidationMessages(messages);
          return;
        }

        setStatusMessage(body?.error ?? "Unable to update species.");
        return;
      }

      setStatusMessage("Species updated.");
      router.refresh();
    } catch {
      setStatusMessage("Unable to update species.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setStatusMessage(null);
    setValidationMessages([]);

    try {
      const response = await fetch(`/api/species/${species.id}`, {
        method: "DELETE",
      });

      const body = (await response.json().catch(() => null)) as ApiErrorBody | null;

      if (!response.ok) {
        setStatusMessage(body?.error ?? "Unable to delete species.");
        return;
      }

      router.push("/platform/butterflies");
      router.refresh();
    } catch {
      setStatusMessage("Unable to delete species.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit species</CardTitle>
        <CardDescription>Update fields or remove this species entry.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSave}>
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
                Extra Image URL 1 <span className="text-muted-foreground text-xs">(Optional)</span>
              </Label>
              <Input
                id="extra_img_1"
                value={extraImg1}
                onChange={(event) => setExtraImg1(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="extra_img_2">
                Extra Image URL 2 <span className="text-muted-foreground text-xs">(Optional)</span>
              </Label>
              <Input
                id="extra_img_2"
                value={extraImg2}
                onChange={(event) => setExtraImg2(event.target.value)}
              />
            </div>
          </div>

          {statusMessage ? (
            <div className="text-sm" role="status" aria-live="polite">
              {statusMessage}
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

          <div className="flex flex-wrap items-center justify-between gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="outline" disabled={isSaving || isDeleting}>
                  {isDeleting ? "Deleting..." : "Delete Species"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent size="sm">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete species?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. The species will be permanently removed.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void handleDelete()}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button type="submit" disabled={isSaving || isDeleting}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
