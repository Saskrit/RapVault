import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ArtistsDirectoryView } from "@/components/artists-directory-view";
import { getSession } from "@/lib/auth";

export default async function ArtistsPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  return (
    <Suspense
      fallback={
        <div className="flex h-[100dvh] items-center justify-center bg-background text-sm text-muted">
          Loading...
        </div>
      }
    >
      <ArtistsDirectoryView />
    </Suspense>
  );
}
