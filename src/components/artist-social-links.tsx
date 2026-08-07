import type { ReactNode } from "react";
import type { SocialLinkKey, SocialLinks } from "@/lib/social-links";
import { SOCIAL_LINK_META } from "@/lib/social-links";

function IconFrame({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 ${className}`}
      fill="currentColor"
      aria-hidden
    >
      {children}
    </svg>
  );
}

const ICONS: Record<SocialLinkKey, ReactNode> = {
  youtubeUrl: (
    <IconFrame>
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8zM9.75 15.5v-7l6.2 3.5-6.2 3.5z" />
    </IconFrame>
  ),
  facebookUrl: (
    <IconFrame>
      <path d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H7v3h3v7h3v-7h3l1-3h-4v-2c0-.6.4-1 1-1z" />
    </IconFrame>
  ),
  instagramUrl: (
    <IconFrame>
      <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm10 2H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3zm-5 3.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 0 1 12 7.5zm0 2A2.5 2.5 0 1 0 14.5 12 2.5 2.5 0 0 0 12 9.5zM17.8 6.2a1.2 1.2 0 1 1-1.2 1.2 1.2 1.2 0 0 1 1.2-1.2z" />
    </IconFrame>
  ),
  spotifyUrl: (
    <IconFrame>
      <path d="M12 1.5A10.5 10.5 0 1 0 22.5 12 10.5 10.5 0 0 0 12 1.5zm4.8 15.1a.75.75 0 0 1-1 .25 8.4 8.4 0 0 0-7.7-.3.75.75 0 1 1-.6-1.4 9.9 9.9 0 0 1 9 .35.75.75 0 0 1 .3 1.1zm1.3-2.9a.9.9 0 0 1-1.2.3 10.7 10.7 0 0 0-9.4-.35.9.9 0 1 1-.7-1.7 12.5 12.5 0 0 1 11 .4.9.9 0 0 1 .3 1.35zm.1-3a1.05 1.05 0 0 1-1.45.35 13.5 13.5 0 0 0-11.4-.4 1.05 1.05 0 1 1-.65-2 15.6 15.6 0 0 1 13.2.5 1.05 1.05 0 0 1 .3 1.55z" />
    </IconFrame>
  ),
  appleMusicUrl: (
    <IconFrame>
      <path d="M18.7 3.2c-.3-.1-2.6-.8-5.2.7v11.4a3.4 3.4 0 1 1-2.2-3.2V6.6c0-.5.1-1 .6-1.3 2.1-1.4 4.2-.9 4.6-.8.5.1.9.5.9 1v7.9a3.4 3.4 0 1 1-2.2-3.2V4.2c0-.5.3-.9.7-1z" />
    </IconFrame>
  ),
};

type ArtistSocialLinksProps = {
  links: Partial<SocialLinks>;
  className?: string;
};

export function ArtistSocialLinks({
  links,
  className = "",
}: ArtistSocialLinksProps) {
  const items = SOCIAL_LINK_META.filter((item) => links[item.key]?.trim());
  if (items.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {items.map((item) => (
        <a
          key={item.key}
          href={links[item.key]}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-muted transition hover:border-accent hover:text-accent"
          aria-label={item.label}
          title={item.label}
        >
          {ICONS[item.key]}
        </a>
      ))}
    </div>
  );
}
