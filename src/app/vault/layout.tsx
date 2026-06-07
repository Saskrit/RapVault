import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vault — RapVault",
};

export default function VaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
