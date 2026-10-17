import { Suspense } from "react";
import { redirect } from "next/navigation";
import { RapVaultLoading } from "@/components/rapvault-loading";
import { VaultSettingsView } from "@/components/vault-settings-view";
import { getSession } from "@/lib/auth";

export default async function VaultSettingsPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  return (
    <Suspense fallback={<RapVaultLoading fullScreen label="Loading..." />}>
      <VaultSettingsView />
    </Suspense>
  );
}
