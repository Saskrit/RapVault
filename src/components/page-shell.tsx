import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";

type PageShellProps = {
  children: React.ReactNode;
  showNav?: boolean;
};

export function PageShell({ children, showNav = true }: PageShellProps) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      {showNav && (
        <header className="shrink-0 border-b border-border bg-card/80 px-4 py-3 backdrop-blur-xl pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6">
          <div className="mx-auto flex w-full max-w-lg items-center justify-between">
            <Logo size={36} href="/" priority />
            <ThemeToggle />
          </div>
        </header>
      )}
      <main className="flex flex-1 items-center justify-center px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-12">
        <div className="w-full max-w-md">{children}</div>
      </main>
      {showNav && (
        <footer className="shrink-0 border-t border-border px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-sm text-muted">
          <Link href="/" className="transition hover:text-foreground">
            ← Back to home
          </Link>
        </footer>
      )}
    </div>
  );
}
