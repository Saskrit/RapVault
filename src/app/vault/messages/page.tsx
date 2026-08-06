import { redirect } from "next/navigation";
import { MessagesInboxView } from "@/components/messages-inbox-view";
import { getSession } from "@/lib/auth";

export default async function MessagesPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  return <MessagesInboxView />;
}
