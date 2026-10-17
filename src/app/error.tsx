"use client";

import { WifiOff, RefreshCw } from "lucide-react";

export default function RootError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const offline =
    typeof navigator !== "undefined" && navigator.onLine === false;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-12 text-center text-foreground">
      <div className="mx-auto flex max-w-md flex-col items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-card text-muted">
          {offline ? (
            <WifiOff className="h-6 w-6 text-amber-500" />
          ) : (
            <RefreshCw className="h-6 w-6 text-accent" />
          )}
        </div>
        <h2 className="text-xl font-semibold tracking-tight">
          {offline ? "You are offline" : "Something went wrong"}
        </h2>
        <p className="text-sm text-muted">
          {offline
            ? "The page remains in its current state. Cached work is preserved. Click reload to refresh when you're ready."
            : "An unexpected error occurred while displaying this page. Click reload to try again."}
        </p>
        <div className="mt-2 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="flex min-h-11 items-center gap-2 rounded-xl bg-accent px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-accent/90"
          >
            <RefreshCw className="h-4 w-4" />
            Reload
          </button>
        </div>
      </div>
    </div>
  );
}
