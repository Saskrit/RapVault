import { Suspense } from "react";
import { redirect } from "next/navigation";
import { MessagesInboxView } from "@/components/messages-inbox-view";
import { RapVaultLoading } from "@/components/rapvault-loading";
import { getSession } from "@/lib/auth";

export default async function MessagesPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  return (
    <Suspense fallback={<RapVaultLoading fullScreen label="Loading..." />}>
      <MessagesInboxView />
    </Suspense>
  );
}
