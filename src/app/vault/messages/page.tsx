import { Suspense } from "react";
import { redirect } from "next/navigation";
import { MessagesInboxView } from "@/components/messages-inbox-view";
import { getSession } from "@/lib/auth";

export default async function MessagesPage() {
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
      <MessagesInboxView />
    </Suspense>
  );
}
