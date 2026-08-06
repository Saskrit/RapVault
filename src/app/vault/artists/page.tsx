import { redirect } from "next/navigation";
import { ArtistsDirectoryView } from "@/components/artists-directory-view";
import { getSession } from "@/lib/auth";

export default async function ArtistsPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  return <ArtistsDirectoryView />;
}
