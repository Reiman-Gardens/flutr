import { Link } from "@/components/ui/link";

export default function UnauthorizedPage() {
  return (
    <main style={{ padding: "40px", fontFamily: "system-ui, sans-serif" }}>
      <h1>Access Denied</h1>
      <p>You do not have permission to view this page.</p>
      <p>
        <Link href="/">Return home</Link> | <Link href="/login">Sign in</Link>
      </p>
    </main>
  );
}
