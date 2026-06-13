#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";
import { marked } from "marked";
import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import javascript from "highlight.js/lib/languages/javascript";
import python from "highlight.js/lib/languages/python";
import typescript from "highlight.js/lib/languages/typescript";

const ROOT = process.cwd();
const BLOG_DIR = path.join(ROOT, "src", "data", "blogs");
const DIST_DIR = path.join(ROOT, "dist");
const BASE_PATH = process.env.BASE_PATH || "/terminal/";
const BLOG_COMMENTS_REPO = "failuresmith/terminal";
const BLOG_COMMENTS_ISSUE_TERM = "pathname";
const BLOG_TAG_PARAM = "tag";

hljs.registerLanguage("bash", bash);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("python", python);
hljs.registerLanguage("typescript", typescript);

const LANGUAGE_ALIASES = {
  js: "javascript",
  sh: "bash",
  shell: "bash",
  sol: "javascript",
  solidity: "javascript",
  ts: "typescript",
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeLanguage(infostring) {
  const raw = String(infostring || "").trim().split(/\s+/)[0]?.toLowerCase() || "";
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

function highlightCode(code, infostring) {
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

marked.setOptions({
  gfm: true,
  breaks: false,
  renderer,
});

function parseFrontMatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw.trim() };

  const meta = {};
  match[1]
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const [key, ...rest] = line.split(":");
      if (!key || !rest.length) return;
      const valueRaw = rest.join(":").trim();
      if (!valueRaw) return;

      if (valueRaw.startsWith("[") && valueRaw.endsWith("]")) {
        try {
          const parsed = JSON.parse(valueRaw);
          if (key.trim() === "tags" && Array.isArray(parsed)) {
            meta.tags = parsed.map(String);
            return;
          }
        } catch {
          // Fall through to string parsing.
        }
      }

      meta[key.trim()] = valueRaw.replace(/^"|"$/g, "").trim();
    });

  return { meta, body: (match[2] || "").trim() };
}

function markdownToPlain(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```/g, ""))
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/\r/g, "");
}

function estimateReadingMinutes(plain) {
  const words = plain.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  return Math.max(1, Math.ceil(words.length / 200));
}

function renderReadTime(minutes) {
  const safeMinutes = Math.max(1, Number(minutes) || 1);
  const label = `${safeMinutes} ${safeMinutes === 1 ? "minute" : "minutes"} read`;

  return `
    <span class="blog-readTime" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">
      <span aria-hidden="true">${safeMinutes}'</span>
      <svg class="blog-readTimeIcon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M12 6v6l4 2"></path>
      </svg>
    </span>`.trim();
}

function withBase(relativePath) {
  const base = BASE_PATH.endsWith("/") ? BASE_PATH.slice(0, -1) : BASE_PATH;
  return `${base}${relativePath}`;
}

function normalizeTag(tag) {
  return String(tag || "").trim().toLowerCase();
}

function formatTagLabel(tag) {
  return normalizeTag(tag)
    .split(/(\s+|-)/)
    .map((part) => {
      if (!part.trim() || part === "-") return part;
      if (part === "&") return part;
      if (part === "ai") return "AI";
      return `${part[0].toUpperCase()}${part.slice(1)}`;
    })
    .join("");
}

function tagHref(tag) {
  const params = new URLSearchParams({ [BLOG_TAG_PARAM]: normalizeTag(tag) });
  return `${withBase("/blog/")}?${params.toString()}`;
}

function renderTopicTags(tags, className) {
  const uniqueTags = Array.from(new Set(tags.map(normalizeTag))).filter(Boolean);
  if (!uniqueTags.length) return "";

  const items = uniqueTags
    .map((tag, index) => {
      const label = formatTagLabel(tag);
      const dot = index
        ? '<span class="blog-topicDot" aria-hidden="true">·</span>'
        : "";

      return `
        <span class="blog-topicTagItem">
          ${dot}
          <a
            class="blog-topicTag"
            href="${escapeHtml(tagHref(tag))}"
            aria-label="Filter blog posts tagged ${escapeHtml(label)}"
          >${escapeHtml(label)}</a>
        </span>`.trim();
    })
    .join("\n");

  return `<div class="${escapeHtml(className)}" aria-label="Blog topics">${items}</div>`;
}

async function loadPosts() {
  const entries = await fs.readdir(BLOG_DIR, { withFileTypes: true });
  const posts = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;

    const filePath = path.join(BLOG_DIR, entry.name);
    const raw = await fs.readFile(filePath, "utf8");
    const { meta, body } = parseFrontMatter(raw);
    const fallbackSlug = entry.name.replace(/\.md$/, "");
    const plain = markdownToPlain(body);

    posts.push({
      slug: fallbackSlug,
      title: meta.title || fallbackSlug,
      date: meta.date,
      tags: Array.isArray(meta.tags) ? meta.tags.map((tag) => tag.toLowerCase()) : [],
      summary: meta.summary,
      body,
      readingMinutes: estimateReadingMinutes(plain),
    });
  }

  return posts.sort((a, b) => {
    if (a.date && b.date) return b.date.localeCompare(a.date);
    return a.title.localeCompare(b.title);
  });
}

function applySeo(template, { title, description }) {
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  let html = template.replace(/<title>[\s\S]*?<\/title>/, `<title>${safeTitle}</title>`);

  if (/<meta\s+name="description"/.test(html)) {
    html = html.replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
      `<meta name="description" content="${safeDescription}" />`,
    );
  } else {
    html = html.replace(
      /<meta name="referrer" content="no-referrer" \/>/,
      `<meta name="referrer" content="no-referrer" />\n    <meta name="description" content="${safeDescription}" />`,
    );
  }

  return html;
}

async function writeHtml(routePath, template, seo, content) {
  const html = applySeo(template, seo).replace(
    '<div id="root"></div>',
    `<div id="root">${content}</div>`,
  );
  const outputDir = path.join(DIST_DIR, routePath);
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(path.join(outputDir, "index.html"), html);
}

function renderBlogNavigation({ showBlogLink = false } = {}) {
  const blogLink = showBlogLink
    ? `<a class="blog-backLink" href="${escapeHtml(withBase("/blog/"))}">Blog</a>`
    : "";
  return `
    <header class="blog-siteHeader" aria-label="Primary">
      <nav class="blog-nav" aria-label="Blog navigation">
        <a class="blog-homeLink" href="${escapeHtml(withBase("/"))}">Milad</a>
        ${blogLink}
      </nav>
    </header>`.trim();
}

function renderBlogComments() {
  return `
    <section class="blog-comments" aria-labelledby="blog-comments-title">
      <h2 id="blog-comments-title">Comments</h2>
      <div
        class="blog-commentsEmbed"
        data-comments-repo="${escapeHtml(BLOG_COMMENTS_REPO)}"
        data-comments-issue-term="${escapeHtml(BLOG_COMMENTS_ISSUE_TERM)}"
      ></div>
    </section>`.trim();
}

function renderBlogIndex(posts) {
  const items = posts
    .map((post) => {
      const summary = post.summary ? `<p>${escapeHtml(post.summary)}</p>` : "";

      return `
        <article class="blog-listItem">
          <div class="blog-listItemContent">
            <a class="blog-listBody" href="${escapeHtml(withBase(`/blog/${encodeURIComponent(post.slug)}/`))}">
              <h2>${escapeHtml(post.title)}</h2>
              ${summary}
            </a>
            ${renderReadTime(post.readingMinutes)}
          </div>
          ${renderTopicTags(post.tags, "blog-listTags")}
        </article>`.trim();
    })
    .join("\n");

  return `
    <main class="blog-page is-entering">
      ${renderBlogNavigation()}
      <header class="blog-header">
        <h1>Blog</h1>
        <p>Notes by topic on systems, security, automation, and life.</p>
      </header>
      <section class="blog-list" aria-label="Blog posts">
        ${items}
      </section>
    </main>`.trim();
}

async function renderPost(post) {
  const summary = post.summary ? `<p>${escapeHtml(post.summary)}</p>` : "";
  const body = await marked.parse(post.body);

  return `
    <main class="blog-page is-entering">
      ${renderBlogNavigation({ showBlogLink: true })}
      <article class="blog-article">
        <header class="blog-articleHeader">
          <h1>${escapeHtml(post.title)}</h1>
          <div class="blog-meta">
            ${renderTopicTags(post.tags, "blog-metaTags")}
            ${renderReadTime(post.readingMinutes)}
          </div>
          ${summary}
        </header>
        <div class="t-markdown t-markdown--blog">
          <div class="t-markdownBody">${body}</div>
        </div>
      </article>
      ${renderBlogComments()}
    </main>`.trim();
}

async function main() {
  const templatePath = path.join(DIST_DIR, "index.html");
  const template = await fs.readFile(templatePath, "utf8");
  if (!template.includes('<div id="root"></div>')) {
    throw new Error("dist/index.html does not contain an empty #root placeholder");
  }

  const posts = await loadPosts();
  await writeHtml(
    "blog",
    template,
    {
      title: "Blog | Milad",
      description:
        "FailureSmith notes on reliability, automation risk, execution ownership, and production systems.",
    },
    renderBlogIndex(posts),
  );

  for (const post of posts) {
    await writeHtml(
      path.join("blog", post.slug),
      template,
      {
        title: `${post.title} | Milad`,
        description:
          post.summary ||
          `FailureSmith blog post: ${post.title}.`,
      },
      await renderPost(post),
    );
  }

  console.log(`prerendered blog index and ${posts.length} blog posts`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
