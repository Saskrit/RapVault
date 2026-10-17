import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ArtistsDirectoryView } from "@/components/artists-directory-view";
import { RapVaultLoading } from "@/components/rapvault-loading";
import { getSession } from "@/lib/auth";

export default async function ArtistsPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  return (
    <Suspense fallback={<RapVaultLoading fullScreen label="Loading..." />}>
      <ArtistsDirectoryView />
    </Suspense>
  );
}
