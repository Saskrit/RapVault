import { redirect } from "next/navigation";
import { VaultSongsView } from "@/components/vault-songs-view";
import { getSession } from "@/lib/auth";

export default async function VaultPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  return <VaultSongsView />;
}
