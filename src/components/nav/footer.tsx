"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useInstitution } from "@/hooks/use-institution";
import { InstitutionFooter } from "./institution-footer";

export interface InstitutionInfo {
  name: string;
  street_address: string;
  extended_address?: string | null;
  city: string;
  state_province: string;
  postal_code: string;
  country: string;
  email_address?: string | null;
  phone_number?: string | null;
  website_url?: string | null;
  social_links?: SocialLinks | null;
}

export interface SocialLinks {
  x?: string;
  facebook?: string;
  instagram?: string;
  youtube?: string;
}

function Copyright() {
  return (
    <p className="text-muted-foreground text-sm">
      &copy; {new Date().getFullYear()} Flutr. All rights reserved.
    </p>
  );
}

export function Footer() {
  const pathname = usePathname();
  const { slug } = useInstitution();
  const [institution, setInstitution] = useState<InstitutionInfo | null>(null);

  useEffect(() => {
    if (!slug) return;

    fetch(`/api/public/institutions/${encodeURIComponent(slug)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.institution) setInstitution(data.institution);
      })
      .catch(() => {});
  }, [slug]);

  if (pathname === "/") {
    return (
      <footer className="border-t py-6">
        <div className="mx-auto max-w-[90vw] px-4 sm:px-6 lg:px-8">
          <Copyright />
        </div>
      </footer>
    );
  }

  return (
    <footer className="border-t py-5">
      <div className="mx-auto max-w-[90vw] px-4 sm:px-6 lg:px-8">
        {institution && <InstitutionFooter institution={institution} />}
        <div className="mt-8 flex items-center justify-between border-t pt-6">
          <Copyright />
          <Link
            href="/login"
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            Institution Login
          </Link>
        </div>
      </div>
    </footer>
  );
}
