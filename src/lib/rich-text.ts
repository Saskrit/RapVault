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

const BLOCK_TAGS = new Set([
  "p",
  "div",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "pre",
  "li",
  "tr",
]);

function htmlNodesToPlainText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? "";
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const el = node as Element;
  const tag = el.tagName.toLowerCase();

  if (tag === "br") return "\n";

  let text = "";
  for (const child of el.childNodes) {
    text += htmlNodesToPlainText(child);
  }

  if (BLOCK_TAGS.has(tag) && text.length > 0 && !text.endsWith("\n")) {
    text += "\n";
  }

  return text;
}

function htmlStringToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|blockquote|pre|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function stripRichText(content: string): string {
  if (!content.trim()) return "";

  const html = contentToHtml(content);
  const plain =
    typeof document !== "undefined"
      ? (() => {
          const el = document.createElement("div");
          el.innerHTML = html;
          return htmlNodesToPlainText(el);
        })()
      : htmlStringToPlainText(html);

  return plain.replace(/\u00a0/g, " ").trimEnd();
}

export function contentSnippet(content: string, maxLength = 80): string {
  const plain = stripRichText(content);
  if (!plain) return "Empty draft";
  if (plain.length <= maxLength) return plain;
  return `${plain.slice(0, maxLength)}…`;
}
