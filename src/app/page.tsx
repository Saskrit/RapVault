import { redirect } from "next/navigation";
import { LandingPage } from "@/components/landing-page";
import { getSession } from "@/lib/auth";

export default async function HomePage() {
  const user = await getSession();
  if (user) redirect("/vault");

  return <LandingPage />;
}
