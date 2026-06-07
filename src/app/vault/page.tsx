import { redirect } from "next/navigation";
import { VaultApp } from "@/components/vault-app";
import { getSession } from "@/lib/auth";

export default async function VaultPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  return <VaultApp />;
}
