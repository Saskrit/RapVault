import { Suspense } from "react";
import { redirect } from "next/navigation";
import { MessageThreadView } from "@/components/message-thread-view";
import { RapVaultLoading } from "@/components/rapvault-loading";
import { getSession } from "@/lib/auth";

type PageProps = {
  params: Promise<{ conversationId: string }>;
};

export default async function MessageThreadPage({ params }: PageProps) {
  const user = await getSession();
  if (!user) redirect("/login");
  const { conversationId } = await params;
  return (
    <Suspense fallback={<RapVaultLoading fullScreen label="Loading..." />}>
      <MessageThreadView conversationId={conversationId} />
    </Suspense>
  );
}
