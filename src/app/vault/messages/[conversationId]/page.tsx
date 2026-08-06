import { redirect } from "next/navigation";
import { MessageThreadView } from "@/components/message-thread-view";
import { getSession } from "@/lib/auth";

type PageProps = {
  params: Promise<{ conversationId: string }>;
};

export default async function MessageThreadPage({ params }: PageProps) {
  const user = await getSession();
  if (!user) redirect("/login");
  const { conversationId } = await params;
  return <MessageThreadView conversationId={conversationId} />;
}
