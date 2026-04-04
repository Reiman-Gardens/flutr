import { Navbar } from "@/components/nav/nav";
import { Footer } from "@/components/nav/footer";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main id="main-content" className="flex-1 pb-20 md:pb-6">
        {children}
      </main>
      <Footer />
    </>
  );
}
