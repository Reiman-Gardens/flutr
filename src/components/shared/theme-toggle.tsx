"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

import { getNextTheme, getThemeLabel } from "@/lib/theme-utils";

const emptySubscribe = () => () => {};
const getTrue = () => true;
const getFalse = () => false;

export function MobileThemeToggle() {
  const mounted = useSyncExternalStore(emptySubscribe, getTrue, getFalse);
  const { resolvedTheme, setTheme } = useTheme();

  const isDark = mounted && resolvedTheme === "dark";
  const toggle = () => setTheme(getNextTheme(resolvedTheme));
  const label = getThemeLabel(mounted, isDark);

  return (
    <DropdownMenuItem onClick={toggle} aria-label={label} className="flex items-center gap-2">
      {isDark ? (
        <Moon className="size-4" aria-hidden="true" />
      ) : (
        <Sun className="size-4" aria-hidden="true" />
      )}
      <span>{isDark ? "Light mode" : "Dark mode"}</span>
    </DropdownMenuItem>
  );
}

export function ThemeToggle() {
  const mounted = useSyncExternalStore(emptySubscribe, getTrue, getFalse);
  const { resolvedTheme, setTheme } = useTheme();

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" aria-label="Toggle theme" disabled>
        <Sun className="size-5" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      onClick={() => setTheme(getNextTheme(resolvedTheme))}
      aria-label={getThemeLabel(true, resolvedTheme === "dark")}
    >
      <Sun
        className="size-5 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90"
        aria-hidden="true"
      />
      <Moon
        className="absolute size-5 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"
        aria-hidden="true"
      />
    </Button>
  );
}
