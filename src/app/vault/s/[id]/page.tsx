import { redirect } from "next/navigation";
import { PublicSongView } from "@/components/public-song-view";
import { getSession } from "@/lib/auth";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PublicSongPage({ params }: PageProps) {
  const user = await getSession();
  if (!user) redirect("/login");

  const { id } = await params;
  return <PublicSongView songId={id} />;
}
