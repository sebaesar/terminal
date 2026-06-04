import { useEffect, useState } from "react";
import { marked } from "marked";
import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import javascript from "highlight.js/lib/languages/javascript";
import python from "highlight.js/lib/languages/python";
import typescript from "highlight.js/lib/languages/typescript";
import { MarkdownSegment } from "@types";

hljs.registerLanguage("bash", bash);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("python", python);
hljs.registerLanguage("typescript", typescript);

const LANGUAGE_ALIASES: Record<string, string> = {
  js: "javascript",
  sh: "bash",
  shell: "bash",
  sol: "javascript",
  solidity: "javascript",
  ts: "typescript",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeLanguage(infostring?: string): { raw: string; highlightAs?: string } {
  const raw = (infostring || "").trim().split(/\s+/)[0]?.toLowerCase() || "";
  const highlightAs = LANGUAGE_ALIASES[raw] || raw;
  if (
    !highlightAs ||
    highlightAs === "text" ||
    highlightAs === "txt" ||
    highlightAs === "plaintext"
  ) {
    return { raw };
  }

  return hljs.getLanguage(highlightAs) ? { raw, highlightAs } : { raw };
}

function highlightCode(code: string, infostring?: string): string {
  const { raw, highlightAs } = normalizeLanguage(infostring);
  const className = raw
    ? ` class="hljs language-${escapeHtml(raw)}"`
    : ` class="hljs"`;

  if (!highlightAs) {
    return `<pre><code${className}>${escapeHtml(code)}</code></pre>\n`;
  }

  const highlighted = hljs.highlight(code, {
    language: highlightAs,
    ignoreIllegals: true,
  }).value;

  return `<pre><code${className}>${highlighted}</code></pre>\n`;
}

const renderer = new marked.Renderer();
renderer.code = (code, infostring) => highlightCode(code, infostring);

// Centralized markdown renderer used for blog content and log bodies.
marked.setOptions({
  gfm: true,
  breaks: false,
  renderer,
});

export function renderMarkdown(markdown: string): Promise<string> {
  const result = marked.parse(markdown);
  return Promise.resolve(result).then((value) => value || "");
}

const WRITTEN_DATE_FORMATTER = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

function formatWrittenDate(date?: string): string | null {
  if (!date) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  if (!match) return date.trim() || null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (
    !Number.isFinite(year) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return date.trim();
  }

  const writtenAt = new Date(Date.UTC(year, month - 1, day));
  if (
    writtenAt.getUTCFullYear() !== year ||
    writtenAt.getUTCMonth() !== month - 1 ||
    writtenAt.getUTCDate() !== day
  ) {
    return date.trim();
  }

  return WRITTEN_DATE_FORMATTER.format(writtenAt).toUpperCase();
}

export function MarkdownBlock({ segment }: { segment: MarkdownSegment }) {
  const [html, setHtml] = useState<string>("");
  const writtenDate =
    segment.variant === "blog" ? formatWrittenDate(segment.date) : null;

  useEffect(() => {
    let cancelled = false;
    renderMarkdown(segment.markdown).then((value) => {
      if (!cancelled) setHtml(value || "");
    });
    return () => {
      cancelled = true;
    };
  }, [segment.markdown]);

  return (
    <div
      className={`t-markdown${segment.variant === "blog" ? " t-markdown--blog" : ""}`}
    >
      {segment.title ? (
        <h3 className="t-markdownTitle">{segment.title}</h3>
      ) : null}
      {writtenDate ? (
        <div className="t-markdownDate" aria-label={`Written ${writtenDate}`}>
          {writtenDate}
        </div>
      ) : null}
      <div
        className="t-markdownBody"
        // content originates from local markdown files we author
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
