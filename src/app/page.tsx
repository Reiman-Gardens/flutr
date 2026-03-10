"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type PublicInstitution = {
  id: number;
  slug: string;
  name: string;
  city: string | null;
  state_province: string | null;
  country: string | null;
};

export default function Home() {
  const [institutions, setInstitutions] = useState<PublicInstitution[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const loadInstitutions = async () => {
      try {
        const response = await fetch("/api/public/institutions");
        const result = await response.json().catch(() => null);

        if (!response.ok || !Array.isArray(result)) {
          setStatus("error");
          return;
        }

        setInstitutions(result);
        setStatus("ready");
      } catch {
        setStatus("error");
      }
    };

    void loadInstitutions();
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b px-6 py-8">
        <h1 className="text-3xl font-semibold">Flutr</h1>
        <p className="text-muted-foreground mt-2 text-sm">Select an institution to continue.</p>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        {status === "loading" ? (
          <p className="text-muted-foreground text-sm">Loading institutions...</p>
        ) : status === "error" ? (
          <p className="text-destructive text-sm">Unable to load institutions.</p>
        ) : institutions.length === 0 ? (
          <p className="text-muted-foreground text-sm">No institutions available.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {institutions.map((institution) => (
              <Link
                key={institution.id}
                href={`/${institution.slug}`}
                className="hover:bg-muted rounded-md border p-4 transition-colors"
              >
                <h2 className="font-medium">{institution.name}</h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  {[institution.city, institution.state_province, institution.country]
                    .filter(Boolean)
                    .join(", ") || "Location unavailable"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t px-6 py-4">
        <div className="flex justify-end">
          <Link
            href="/login"
            className="hover:bg-muted rounded-md border px-4 py-2 text-sm font-medium transition-colors"
          >
            Login
          </Link>
        </div>
      </footer>
    </div>
  );
}
