import { LandingPage } from "@/components/landing-page";
import { getSession } from "@/lib/auth";
import { getRandomFinishedHeroSong } from "@/lib/hero-preview-song";

export default async function HomePage() {
  const user = await getSession();
  const previewSong = user
    ? await getRandomFinishedHeroSong(user.id)
    : null;

  return (
    <LandingPage
      isLoggedIn={Boolean(user)}
      previewSong={previewSong}
    />
  );
}
