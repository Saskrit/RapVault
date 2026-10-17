import { Suspense } from "react";
import { redirect } from "next/navigation";
import { RapVaultLoading } from "@/components/rapvault-loading";
import { StatsView } from "@/components/stats-view";
import { getSession } from "@/lib/auth";

export default async function StatsPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  return (
    <Suspense fallback={<RapVaultLoading fullScreen label="Loading..." />}>
      <StatsView />
    </Suspense>
  );
}
