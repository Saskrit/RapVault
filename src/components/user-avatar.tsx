"use client";

import { UserRound } from "lucide-react";

type UserAvatarProps = {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  /** When set, shows online (green) or offline (gray) indicator. */
  online?: boolean;
};

const sizes = {
  sm: "h-9 w-9 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-16 w-16 text-xl",
  xl: "h-28 w-28 text-3xl sm:h-32 sm:w-32",
};

const presenceSizes = {
  sm: "h-2.5 w-2.5",
  md: "h-3 w-3",
  lg: "h-3.5 w-3.5",
  xl: "h-4 w-4",
};

export function UserAvatar({
  src,
  name,
  size = "md",
  className = "",
  online,
}: UserAvatarProps) {
  const initials = name
    .split(/[\s@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  const showPresence = typeof online === "boolean";

  return (
    <div className={`relative shrink-0 ${className}`}>
      <div
        className={`overflow-hidden rounded-full border border-border bg-sidebar ${sizes[size]}`}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-bold tracking-tight text-foreground">
            {initials || <UserRound className="h-1/2 w-1/2 text-muted" />}
          </div>
        )}
      </div>
      {showPresence && (
        <span
          className={`absolute bottom-0 right-0 rounded-full ring-2 ring-card ${presenceSizes[size]} ${
            online ? "bg-emerald-500" : "bg-zinc-400 dark:bg-zinc-500"
          }`}
          title={online ? "Online" : "Offline"}
          aria-label={online ? "Online" : "Offline"}
        />
      )}
    </div>
  );
}
