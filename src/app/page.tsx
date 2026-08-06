import { LandingPage } from "@/components/landing-page";
import { getSession } from "@/lib/auth";

export default async function HomePage() {
  const user = await getSession();
  return <LandingPage isLoggedIn={Boolean(user)} />;
}
