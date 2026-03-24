"use client";

import { useSession, signOut } from "next-auth/react";
import { Link } from "@/components/ui/link";
import { useInstitutionData } from "@/components/providers/institution-provider";
import { Button } from "@/components/ui/button";
import { InstitutionFooter } from "./institution-footer";

function Copyright() {
  return (
    <p className="text-muted-foreground text-sm">
      &copy; {new Date().getFullYear()} Flutr. All rights reserved.
    </p>
  );
}

export function Footer() {
  const institution = useInstitutionData();
  const { data: session } = useSession();

  const handleSignOut = async () => {
    await signOut({ redirectTo: "/login" });
  };

  return (
    <footer className="mb-16 border-t py-5 md:mb-0">
      <div className="mx-auto max-w-[90vw] px-4 sm:px-6 lg:px-8">
        {institution && <InstitutionFooter institution={institution} />}
        <div className="mt-8 flex items-center justify-between border-t pt-6">
          <Copyright />
          {session ? (
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              Sign Out
            </Button>
          ) : (
            <Button asChild variant="outline" size="sm" className="text-muted-foreground">
              <Link href="/login">Institution Login</Link>
            </Button>
          )}
        </div>
      </div>
    </footer>
  );
}
