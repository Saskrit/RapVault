import type { SocialLinks } from "@/lib/social-links";
import { pickSocialLinks } from "@/lib/social-links";

type UserLike = {
  id: string;
  email: string;
  name: string | null;
  displayName: string | null;
  username: string | null;
  bio: string;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  profilePublic: boolean;
  youtubeUrl?: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  spotifyUrl?: string | null;
  appleMusicUrl?: string | null;
  recoveryEmail: string | null;
  password?: string | null;
  googleId?: string | null;
  totpEnabled?: boolean;
  totpSecret?: string | null;
  createdAt: Date;
};

export function toPublicUser(user: UserLike) {
  const social = pickSocialLinks(user as Partial<SocialLinks>);
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    displayName: user.displayName || user.name,
    username: user.username,
    bio: user.bio,
    avatarUrl: user.avatarUrl || null,
    coverUrl: user.coverUrl || null,
    profilePublic: user.profilePublic,
    ...social,
    recoveryEmail: user.recoveryEmail,
    hasPassword: Boolean(user.password),
    hasGoogle: Boolean(user.googleId),
    hasTotp: Boolean(user.totpEnabled && user.totpSecret),
    createdAt: user.createdAt.toISOString(),
    needsUsername: !user.username,
  };
}
