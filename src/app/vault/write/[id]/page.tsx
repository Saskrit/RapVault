import { VaultEditorView } from "@/components/vault-editor-view";

type PageProps = {
  params: Promise<{ id: string }>;
};

/** Auth via middleware; keep page light for offline caching. */
export default async function WritePage({ params }: PageProps) {
  const { id } = await params;
  return <VaultEditorView songId={id} />;
}
