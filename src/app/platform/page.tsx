import Link from "next/link";

export default function PlatformPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-6 py-10">
      <h1 className="text-3xl font-semibold">Platform Dashboard</h1>
      <div className="flex flex-col gap-2">
        <Link href="/platform/institutions" className="underline">
          Institutions
        </Link>
        <Link href="/platform/butterflies" className="underline">
          Butterflies
        </Link>
      </div>
    </main>
  );
}
