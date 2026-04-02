export default function PlatformFooter() {
  const year = new Date().getUTCFullYear();

  return (
    <footer
      aria-label="Platform footer"
      className="bg-background flex shrink-0 items-center justify-between border-t px-6 py-3"
    >
      <p className="text-muted-foreground text-xs">&copy; {year} Flutr Platform</p>
      <p className="text-muted-foreground text-xs">All Systems Operational</p>
    </footer>
  );
}
