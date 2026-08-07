import { Suspense } from "react";
import { redirect } from "next/navigation";
import { RapVaultLoading } from "@/components/rapvault-loading";
import { VaultSongsView } from "@/components/vault-songs-view";
import { getSession } from "@/lib/auth";

export default async function VaultPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  return (
    <Suspense fallback={<RapVaultLoading fullScreen label="Loading..." />}>
      <VaultSongsView />
    </Suspense>
  );
}
