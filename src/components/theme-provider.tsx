"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useEffect } from "react";
import { useCookieConsentOptional } from "@/components/cookie-consent-provider";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const consent = useCookieConsentOptional();
  const persistTheme = Boolean(consent?.consent?.preferences);

  useEffect(() => {
    if (persistTheme) return;
    try {
      localStorage.removeItem("rapvault-theme");
      localStorage.removeItem("theme");
    } catch {
      // ignore
    }
  }, [persistTheme]);

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={persistTheme}
      storageKey={persistTheme ? "rapvault-theme" : "rapvault-theme-ephemeral"}
      enableColorScheme
    >
      {children}
    </NextThemesProvider>
  );
}
