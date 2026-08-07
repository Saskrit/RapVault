"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const toggleBtn =
  "flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted transition hover:border-foreground/20 hover:text-foreground active:scale-95 sm:h-9 sm:w-9 lg:h-10 lg:w-10 lg:rounded-xl";

const toggleIcon = "h-3.5 w-3.5 lg:h-4 lg:w-4";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <button
        type="button"
        className={toggleBtn}
        aria-label="Toggle theme"
      >
        <Moon className={toggleIcon} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className={toggleBtn}
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <Sun className={toggleIcon} />
      ) : (
        <Moon className={toggleIcon} />
      )}
    </button>
  );
}
