import Link from "next/link";
import { CookiePreferencesButton } from "@/components/cookie-preferences-button";
import { Logo, BrandWordmark } from "@/components/logo";

export const metadata = {
  title: "Cookies & storage — RapVault",
  description:
    "How RapVault uses essential cookies, optional preferences, and offline cache.",
};

export default function CookiesPage() {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <header className="border-b border-border/60 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-3 sm:px-8">
          <div className="flex items-center gap-2">
            <Logo size={30} href="/" />
            <BrandWordmark height={16} href="/" />
          </div>
          <Link
            href="/"
            className="text-sm font-medium text-muted transition hover:text-foreground"
          >
            Home
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          Privacy
        </p>
        <h1 className="mt-3 type-h1">Cookies &amp; local storage</h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
          RapVault asks for permission before using optional cookies or device
          storage. Essential cookies keep you signed in. Everything else is
          optional and can be changed anytime.
        </p>

        <div className="mt-6">
          <CookiePreferencesButton />
        </div>

        <section className="mt-12 space-y-8">
          <div>
            <h2 className="type-h3">Essential (always on)</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Session cookie for authentication, short-lived Google OAuth state
              cookies, and the consent record itself so we remember your choice.
              Without these, sign-in cannot work securely.
            </p>
          </div>

          <div>
            <h2 className="type-h3">Preferences (optional)</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Stored only on your device: theme, sidebar open/closed, lyric font
              size, page size, spell-check, and editor split layout. Denied =
              settings reset each visit and we do not write those keys.
            </p>
          </div>

          <div>
            <h2 className="type-h3">Offline &amp; app cache (optional)</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Local song cache, pending offline edit queue, and the service
              worker / Cache API used for the installable app. Denied = we
              unregister the service worker, delete RapVault caches, and stop
              writing offline data so cache/cookie errors stay clear.
            </p>
          </div>

          <div>
            <h2 className="type-h3">What we do not do</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              No third-party advertising cookies. No analytics SDKs that track
              you across sites. YouTube embeds use the privacy-enhanced
              nocookie domain when you paste a beat.
            </p>
          </div>
        </section>

        <p className="mt-12 text-sm text-muted">
          Questions? Change your choices with the button above, or from Settings
          → Privacy when signed in.
        </p>
      </main>
    </div>
  );
}
