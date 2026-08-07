import { Suspense } from "react";
import { redirect } from "next/navigation";
import { NotificationsView } from "@/components/notifications-view";
import { RapVaultLoading } from "@/components/rapvault-loading";
import { getSession } from "@/lib/auth";

export default async function NotificationsPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  return (
    <Suspense fallback={<RapVaultLoading fullScreen label="Loading..." />}>
      <NotificationsView />
    </Suspense>
  );
}
