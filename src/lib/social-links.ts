export const SOCIAL_LINK_KEYS = [
  "youtubeUrl",
  "facebookUrl",
  "instagramUrl",
  "spotifyUrl",
  "appleMusicUrl",
] as const;

export type SocialLinkKey = (typeof SOCIAL_LINK_KEYS)[number];

export type SocialLinks = Record<SocialLinkKey, string>;

export const SOCIAL_LINK_META: Array<{
  key: SocialLinkKey;
  label: string;
  placeholder: string;
}> = [
  {
    key: "youtubeUrl",
    label: "YouTube",
    placeholder: "https://youtube.com/@yourchannel",
  },
  {
    key: "facebookUrl",
    label: "Facebook",
    placeholder: "https://facebook.com/yourpage",
  },
  {
    key: "instagramUrl",
    label: "Instagram",
    placeholder: "https://instagram.com/yourhandle",
  },
  {
    key: "spotifyUrl",
    label: "Spotify",
    placeholder: "https://open.spotify.com/artist/...",
  },
  {
    key: "appleMusicUrl",
    label: "Apple Music",
    placeholder: "https://music.apple.com/...",
  },
];

export function emptySocialLinks(): SocialLinks {
  return {
    youtubeUrl: "",
    facebookUrl: "",
    instagramUrl: "",
    spotifyUrl: "",
    appleMusicUrl: "",
  };
}

/** Normalize a profile link: empty, or absolute http(s) URL. Returns null if invalid. */
export function normalizeSocialUrl(value: unknown): string | null {
  if (value === undefined) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return "";

  let candidate = trimmed;
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function pickSocialLinks(source: Partial<SocialLinks> | null | undefined): SocialLinks {
  const empty = emptySocialLinks();
  if (!source) return empty;
  for (const key of SOCIAL_LINK_KEYS) {
    empty[key] = typeof source[key] === "string" ? source[key]! : "";
  }
  return empty;
}
