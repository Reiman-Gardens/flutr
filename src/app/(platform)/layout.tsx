export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main-content" className="flex flex-1 flex-col">
      {children}
    </main>
  );
}
