import { Suspense } from "react";
import { redirect } from "next/navigation";
import { NetworkView } from "@/components/network-view";
import { RapVaultLoading } from "@/components/rapvault-loading";
import { getSession } from "@/lib/auth";

export default async function NetworkPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  return (
    <Suspense fallback={<RapVaultLoading fullScreen label="Loading..." />}>
      <NetworkView />
    </Suspense>
  );
}
