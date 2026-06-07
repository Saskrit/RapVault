"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MarkdownContentProps = {
  content: string;
  className?: string;
};

export function MarkdownContent({ content, className = "" }: MarkdownContentProps) {
  return (
    <div className={`lyric-markdown ${className}`.trim()}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || "*Nothing written yet.*"}</ReactMarkdown>
    </div>
  );
}
