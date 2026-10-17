import type { Metadata } from "next";
import { PresenceBeacon } from "@/components/presence-beacon";

export const metadata: Metadata = {
  title: "Vault — RapVault",
};

export default function VaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PresenceBeacon />
      {children}
    </>
  );
}
