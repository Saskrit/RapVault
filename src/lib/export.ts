export function buildTxtExport(song: {
  title: string;
  content: string;
  genre: string;
  moodTags: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}) {
  const header = [
    song.title,
    song.genre ? `Genre: ${song.genre}` : null,
    song.moodTags ? `Tags: ${song.moodTags}` : null,
    `Status: ${song.status}`,
    `Created: ${new Date(song.createdAt).toLocaleString()}`,
    `Modified: ${new Date(song.updatedAt).toLocaleString()}`,
    "",
    "---",
    "",
  ]
    .filter(Boolean)
    .join("\n");

  return `${header}${song.content}`;
}

export function downloadTxt(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename.replace(/[^\w\s-]/g, "").trim() || "song"}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
