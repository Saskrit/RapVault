import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ArtistProfileView } from "@/components/artist-profile-view";
import { RapVaultLoading } from "@/components/rapvault-loading";
import { getSession } from "@/lib/auth";

type PageProps = {
  params: Promise<{ username: string }>;
};

export default async function ArtistPage({ params }: PageProps) {
  const user = await getSession();
  if (!user) redirect("/login");
  const { username } = await params;
  return (
    <Suspense fallback={<RapVaultLoading fullScreen label="Loading..." />}>
      <ArtistProfileView username={username} />
    </Suspense>
  );
}
