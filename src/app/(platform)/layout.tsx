import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-0 z-50 border-b backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="focus-visible:ring-ring rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            <span className="text-lg font-bold tracking-tight">Flutr</span>
          </Link>
          <nav aria-label="Platform navigation">
            <Button variant="outline" size="sm" asChild>
              <Link href="/login">Institution Login</Link>
            </Button>
          </nav>
        </div>
      </header>
      <main id="main-content" className="flex flex-1 flex-col">
        {children}
      </main>
      <footer className="border-t py-5">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <p className="text-muted-foreground text-sm">
            &copy; {new Date().getFullYear()} Flutr. All rights reserved.
          </p>
          <Button asChild variant="outline" size="sm" className="text-muted-foreground">
            <Link href="/login">Institution Login</Link>
          </Button>
        </div>
      </footer>
    </div>
  );
}
