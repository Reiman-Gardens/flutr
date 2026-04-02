import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import InstitutionAddForm from "@/components/platform/institutions/add/institution-add-form";

export default function PlatformAddInstitutionPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-1">
        <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
          <Link href="/platform/institutions">
            <ArrowLeft className="mr-1 size-4" aria-hidden="true" />
            Institutions
          </Link>
        </Button>
        <h1 className="text-3xl font-semibold">Add Institution</h1>
        <p className="text-muted-foreground text-sm">Set up a new institution on the platform.</p>
      </div>

      <InstitutionAddForm />
    </div>
  );
}
