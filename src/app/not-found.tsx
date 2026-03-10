import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { BackButton } from "@/components/shared/back-button";

export default function NotFound() {
  return (
    <main
      id="main-content"
      role="alert"
      className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center"
    >
      {/* Decorative 404 + butterfly silhouette */}
      <div className="relative mb-8 select-none" aria-hidden="true">
        <span className="text-muted-foreground/15 text-[8rem] leading-none font-bold tracking-tighter">
          404
        </span>
        <svg
          viewBox="0 0 100 80"
          className="text-primary/20 absolute -top-2 -right-6 w-16 rotate-12"
          fill="currentColor"
        >
          <path d="M50 40 C30 10, 5 10, 5 35 C5 55, 30 65, 50 40Z" />
          <path d="M50 40 C70 10, 95 10, 95 35 C95 55, 70 65, 50 40Z" />
          <path d="M50 40 C35 50, 15 70, 25 75 C35 80, 45 60, 50 40Z" />
          <path d="M50 40 C65 50, 85 70, 75 75 C65 80, 55 60, 50 40Z" />
        </svg>
      </div>

      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
        <span className="sr-only">Error 404: </span>
        Page not found
      </h1>
      <p className="text-muted-foreground mt-3 max-w-sm text-balance">
        This page seems to have fluttered away. It may have moved or no longer exists.
      </p>

      <nav
        aria-label="Error page navigation"
        className="mt-8 flex flex-wrap items-center justify-center gap-3"
      >
        <BackButton />
        <Button asChild>
          <Link href="/">Browse butterfly houses</Link>
        </Button>
      </nav>
    </main>
  );
}
