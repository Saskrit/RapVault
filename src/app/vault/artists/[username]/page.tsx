import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ArtistProfileView } from "@/components/artist-profile-view";
import { getSession } from "@/lib/auth";

type PageProps = {
  params: Promise<{ username: string }>;
};

export default async function ArtistPage({ params }: PageProps) {
  const user = await getSession();
  if (!user) redirect("/login");
  const { username } = await params;
  return (
    <Suspense
      fallback={
        <div className="flex h-[100dvh] items-center justify-center bg-background text-sm text-muted">
          Loading...
        </div>
      }
    >
      <ArtistProfileView username={username} />
    </Suspense>
  );
}
