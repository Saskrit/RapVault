import Link from "next/link";
import { WifiOff } from "lucide-react";
import { BrandWordmark, Logo } from "@/components/logo";

export const dynamic = "force-static";

export default function OfflineFallbackPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-5 bg-background px-6 text-center text-foreground">
      <div className="flex flex-col items-center gap-3">
        <Logo size={56} href={null} priority />
        <BrandWordmark height={22} href={null} priority />
      </div>
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-card text-muted">
        <WifiOff className="h-5 w-5" />
      </div>
      <div className="max-w-sm">
        <h1 className="text-xl font-semibold tracking-tight">You&apos;re offline</h1>
        <p className="mt-2 text-sm text-muted">
          RapVault can still open songs you&apos;ve used before. Open your vault
          to keep writing — edits sync when you&apos;re back online.
        </p>
      </div>
      <Link
        href="/vault"
        className="min-h-11 rounded-xl bg-accent px-6 text-sm font-semibold leading-[2.75rem] text-white transition hover:bg-accent/90"
      >
        Open vault
      </Link>
    </div>
  );
}
