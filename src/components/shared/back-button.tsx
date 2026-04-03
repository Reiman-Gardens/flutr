"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

interface BackButtonProps {
  fallbackHref?: string;
}

export function BackButton({ fallbackHref = "/" }: BackButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (document.referrer && new URL(document.referrer).origin === window.location.origin) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  };

  return (
    <Button variant="secondary" onClick={handleClick} className="shadow-md">
      <ArrowLeft className="size-4" aria-hidden="true" />
      Go back
    </Button>
  );
}
