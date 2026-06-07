import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { getSession } from "@/lib/auth";

export default async function HomePage() {
  const user = await getSession();
  if (user) redirect("/vault");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="max-w-2xl text-center">
        <div className="mb-6 flex justify-center">
          <Logo size={120} priority />
        </div>
        <p className="mb-10 text-lg text-muted">
          Write hooks, punchlines, and unfinished verses. Auto-save keeps every
          bar safe. Organize by folder, search your catalog, and export when
          you&apos;re ready.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/register"
            className="rounded-xl bg-accent px-6 py-3 font-semibold text-white transition hover:bg-violet-500"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-border px-6 py-3 font-semibold text-foreground transition hover:border-accent hover:text-accent"
          >
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
