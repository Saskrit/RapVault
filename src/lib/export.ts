import { stripRichText } from "@/lib/rich-text";

export type ExportSong = {
  title: string;
  content: string;
  genre: string;
  moodTags: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

function safeFilename(title: string) {
  return `${title.replace(/[^\w\s-]/g, "").trim() || "song"}`;
}

function buildMetaLines(song: ExportSong) {
  return [
    song.genre ? `Genre: ${song.genre}` : null,
    song.moodTags ? `Tags: ${song.moodTags}` : null,
    `Status: ${song.status}`,
    `Created: ${new Date(song.createdAt).toLocaleString()}`,
    `Modified: ${new Date(song.updatedAt).toLocaleString()}`,
  ].filter(Boolean) as string[];
}

export function buildTxtExport(song: ExportSong) {
  const header = [song.title, ...buildMetaLines(song), "", "---", ""].join("\n");
  return `${header}${stripRichText(song.content)}`;
}

export function downloadTxt(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeFilename(filename)}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function downloadPdf(filename: string, song: ExportSong) {
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF();
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - margin * 2;
  const lineHeight = 6;
  let y = margin;

  function ensureSpace(height: number) {
    if (y + height > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  const titleLines = doc.splitTextToSize(song.title || "Untitled", maxWidth);
  ensureSpace(titleLines.length * 10);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 10 + 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90);

  for (const line of buildMetaLines(song)) {
    ensureSpace(lineHeight);
    doc.text(line, margin, y);
    y += lineHeight;
  }

  y += 8;
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  doc.setTextColor(0);
  doc.setFontSize(11);
  const plainContent = stripRichText(song.content || "");
  const contentLines = doc.splitTextToSize(plainContent, maxWidth);

  for (const line of contentLines) {
    ensureSpace(lineHeight);
    doc.text(line, margin, y);
    y += lineHeight;
  }

  doc.save(`${safeFilename(filename)}.pdf`);
}
