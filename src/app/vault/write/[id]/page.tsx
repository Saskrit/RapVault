import { Suspense } from "react";
import { VaultEditorView } from "@/components/vault-editor-view";
import { RapVaultLoading } from "@/components/rapvault-loading";

type PageProps = {
  params: Promise<{ id: string }>;
};

/** Auth via middleware; keep page light for offline caching. */
export default async function WritePage({ params }: PageProps) {
  const { id } = await params;
  return (
    <Suspense fallback={<RapVaultLoading fullScreen label="Loading..." />}>
      <VaultEditorView songId={id} />
    </Suspense>
  );
}
