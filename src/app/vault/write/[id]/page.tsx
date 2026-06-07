import { redirect } from "next/navigation";
import { VaultEditorView } from "@/components/vault-editor-view";
import { getSession } from "@/lib/auth";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function WritePage({ params }: PageProps) {
  const user = await getSession();
  if (!user) redirect("/login");

  const { id } = await params;
  return <VaultEditorView songId={id} />;
}
