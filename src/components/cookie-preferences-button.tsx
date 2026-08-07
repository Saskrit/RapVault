"use client";

import { Cookie } from "lucide-react";
import { useCookieConsent } from "@/components/cookie-consent-provider";

export function CookiePreferencesButton({
  className = "",
  label = "Manage cookie preferences",
  showIcon = true,
}: {
  className?: string;
  label?: string;
  showIcon?: boolean;
}) {
  const { openPreferences } = useCookieConsent();

  return (
    <button
      type="button"
      onClick={openPreferences}
      className={
        className ||
        "inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium transition hover:border-accent hover:text-accent"
      }
    >
      {showIcon && <Cookie className="h-4 w-4" />}
      {label}
    </button>
  );
}
