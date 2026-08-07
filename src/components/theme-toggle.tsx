"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const toggleBtn =
  "flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-muted transition hover:border-foreground/20 hover:text-foreground active:scale-95";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <button type="button" className={toggleBtn} aria-label="Toggle theme">
        <Moon className="h-4 w-4" />
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
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
}
