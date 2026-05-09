import Image from "next/image";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface NewsSectionProps {
  title: string;
  content: string;
  image_url: string | null;
  created_at: Date;
}

export function NewsSection({ title, content, image_url, created_at }: NewsSectionProps) {
  const dateStr = created_at.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <section aria-labelledby="news-heading">
      <h2 id="news-heading" className="mb-4 text-lg font-bold">
        {title}
      </h2>
      <Card className="overflow-hidden py-0">
        {image_url && (
          <div className="relative aspect-video w-full">
            <Image
              src={image_url}
              alt=""
              fill
              sizes="(min-width: 1024px) 66vw, (min-width: 768px) 80vw, 100vw"
              className="object-cover"
            />
          </div>
        )}
        <CardHeader className="pt-6 pb-1">
          <time dateTime={created_at.toISOString()} className="text-muted-foreground text-xs">
            {dateStr}
          </time>
        </CardHeader>
        <CardContent className="pb-6">
          <p className="text-muted-foreground line-clamp-4 text-sm leading-relaxed">{content}</p>
        </CardContent>
      </Card>
    </section>
  );
}
