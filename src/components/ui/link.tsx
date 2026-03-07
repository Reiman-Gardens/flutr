import NextLink from "next/link";
import type { ComponentProps } from "react";

/**
 * A wrapper around Next.js Link that disables automatic prefetching on scroll.
 * Prefetching only occurs on hover/focus instead.
 */
export function Link(props: ComponentProps<typeof NextLink>) {
  return <NextLink prefetch={false} {...props} />;
}
