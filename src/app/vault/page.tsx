import { Suspense } from "react";
import { RapVaultLoading } from "@/components/rapvault-loading";
import { VaultSongsView } from "@/components/vault-songs-view";

/**
 * Auth is enforced by middleware. Keeping this page free of server session
 * fetches makes it easier for the service worker to cache and reopen offline.
 */
export default function VaultPage() {
  return (
    <Suspense fallback={<RapVaultLoading fullScreen label="Loading..." />}>
      <VaultSongsView />
    </Suspense>
  );
}
