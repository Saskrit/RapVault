import Link from "next/link";
import type { ReactNode } from "react";
import { Logo, BrandWordmark } from "@/components/logo";
import { SiteCredit } from "@/components/site-credit";
import { ThemeToggle } from "@/components/theme-toggle";

const LEGAL_NAV = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/cookies", label: "Cookie Policy" },
] as const;

type LegalPageShellProps = {
  active: "privacy" | "terms" | "cookies";
  eyebrow: string;
  title: string;
  description: string;
  effectiveDate: string;
  lastUpdated: string;
  children: ReactNode;
  actions?: ReactNode;
};

export function LegalPageShell({
  active,
  eyebrow,
  title,
  description,
  effectiveDate,
  lastUpdated,
  children,
  actions,
}: LegalPageShellProps) {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/90 backdrop-blur-xl pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-5 py-3 sm:px-8">
          <div className="flex items-center gap-2">
            <Logo size={34} href="/" />
            <BrandWordmark height={16} href="/" />
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <Link
              href="/"
              className="text-sm font-medium text-muted transition hover:text-foreground"
            >
              Home
            </Link>
          </div>
        </div>
      </header>

      <div className="border-b border-border/60 bg-card/40">
        <nav
          className="mx-auto flex w-full max-w-4xl gap-1 overflow-x-auto px-5 py-2 sm:px-8"
          aria-label="Legal documents"
        >
          {LEGAL_NAV.map((item) => {
            const isActive = item.href === `/${active}`;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                    : "text-muted hover:bg-background/70 hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <main className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          {eyebrow}
        </p>
        <h1 className="mt-3 type-h1">{title}</h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
          {description}
        </p>
        <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-2 text-xs text-muted sm:text-sm">
          <div>
            <dt className="inline text-muted">Effective date: </dt>
            <dd className="inline font-medium text-foreground">{effectiveDate}</dd>
          </div>
          <div>
            <dt className="inline text-muted">Last updated: </dt>
            <dd className="inline font-medium text-foreground">{lastUpdated}</dd>
          </div>
        </dl>
        {actions ? <div className="mt-6">{actions}</div> : null}

        <article className="legal-prose mt-10 space-y-10 border-t border-border/60 pt-10">
          {children}
        </article>

        <footer className="mt-14 space-y-6 border-t border-border/60 pt-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
            {LEGAL_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="transition hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
            <Link href="/" className="transition hover:text-foreground">
              Back to RapVault
            </Link>
          </nav>
          <SiteCredit />
        </footer>
      </main>
    </div>
  );
}

export function LegalSection({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28">
      <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-[1.35rem]">
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-[0.95rem] leading-relaxed text-muted [&_a]:font-medium [&_a]:text-accent [&_a]:underline-offset-2 hover:[&_a]:underline [&_li]:mt-1.5 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5 [&_strong]:font-semibold [&_strong]:text-foreground/90 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}
