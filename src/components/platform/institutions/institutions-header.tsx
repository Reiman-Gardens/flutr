import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";

export default function InstitutionsHeader() {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">Institutions</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage tenant institutions across the platform.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button asChild>
          <Link href="/platform/institutions/add">Add Institution</Link>
        </Button>
      </div>
    </div>
  );
}
