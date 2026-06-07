import { marked } from "marked";

marked.setOptions({ breaks: true, gfm: true });

export function isHtmlContent(content: string) {
  return /<\s*[a-z][^>]*>/i.test(content);
}

export function contentToHtml(content: string): string {
  if (!content.trim()) return "";
  if (isHtmlContent(content)) return content;
  return marked.parse(content) as string;
}

export function stripRichText(content: string): string {
  if (!content.trim()) return "";

  const html = contentToHtml(content);
  if (typeof document !== "undefined") {
    const el = document.createElement("div");
    el.innerHTML = html;
    return (el.textContent || "").replace(/\u00a0/g, " ").trim();
  }

  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

export function contentSnippet(content: string, maxLength = 80): string {
  const plain = stripRichText(content);
  if (!plain) return "Empty draft";
  if (plain.length <= maxLength) return plain;
  return `${plain.slice(0, maxLength)}…`;
}
