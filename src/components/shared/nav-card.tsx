import { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/components/ui/link";

interface NavCardProps {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

export default function NavCard({ href, title, description, icon: Icon }: NavCardProps) {
  return (
    <Link
      href={href}
      className="group focus-visible:ring-ring block rounded-lg focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      <Card className="group-hover:bg-muted h-full transition-colors group-hover:shadow-sm">
        <CardContent className="flex flex-col gap-4 p-6">
          <Icon className="text-primary size-8" aria-hidden="true" />
          <div>
            <h2 className="text-base font-semibold">{title}</h2>
            <p className="text-muted-foreground mt-1 text-sm">{description}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
