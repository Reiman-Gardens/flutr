"use client";

import { usePathname } from "next/navigation";
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
    <p className="text-muted-foreground text-center text-sm">
      &copy; {new Date().getFullYear()} Flutr. All rights reserved.
    </p>
  );
}

export function Footer({ institution }: { institution?: InstitutionInfo }) {
  const pathname = usePathname();

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
        <div className="mt-8 border-t pt-6">
          <Copyright />
        </div>
      </div>
    </footer>
  );
}
