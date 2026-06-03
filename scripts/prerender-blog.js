#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";
import { marked } from "marked";

const ROOT = process.cwd();
const BLOG_DIR = path.join(ROOT, "src", "data", "blogs");
const DIST_DIR = path.join(ROOT, "dist");
const BASE_PATH = process.env.BASE_PATH || "/terminal/";

marked.setOptions({
  gfm: true,
  breaks: false,
});

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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

function formatDate(date) {
  if (!date) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return escapeHtml(date);

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(
    new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))),
  );
}

function withBase(relativePath) {
  const base = BASE_PATH.endsWith("/") ? BASE_PATH.slice(0, -1) : BASE_PATH;
  return `${base}${relativePath}`;
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
      slug: meta.slug || fallbackSlug,
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

function renderBlogIndex(posts) {
  const items = posts
    .map((post) => {
      const date = post.date
        ? `<time datetime="${escapeHtml(post.date)}">${escapeHtml(formatDate(post.date))}</time>`
        : "";
      const summary = post.summary ? `<p>${escapeHtml(post.summary)}</p>` : "";

      return `
        <article class="blog-listItem">
          <a href="${escapeHtml(withBase(`/blog/${encodeURIComponent(post.slug)}/`))}">
            <h2>${escapeHtml(post.title)}</h2>
          </a>
          <div class="blog-meta">
            ${date}
            <span>${post.readingMinutes} min read</span>
          </div>
          ${summary}
        </article>`.trim();
    })
    .join("\n");

  return `
    <main class="blog-page is-entering">
      <header class="blog-header">
        <a class="blog-homeLink" href="${escapeHtml(withBase("/"))}">FS.dev</a>
        <h1>Blog</h1>
        <p>FailureSmith notes on reliability, automation risk, execution ownership, and production systems.</p>
      </header>
      <section class="blog-list" aria-label="Blog posts">
        ${items}
      </section>
    </main>`.trim();
}

async function renderPost(post) {
  const date = post.date
    ? `<time datetime="${escapeHtml(post.date)}">${escapeHtml(formatDate(post.date))}</time>`
    : "";
  const summary = post.summary ? `<p>${escapeHtml(post.summary)}</p>` : "";
  const body = await marked.parse(post.body);

  return `
    <main class="blog-page is-entering">
      <header class="blog-header">
        <a class="blog-homeLink" href="${escapeHtml(withBase("/"))}">FS.dev</a>
        <a class="blog-backLink" href="${escapeHtml(withBase("/blog/"))}">Blog</a>
      </header>
      <article class="blog-article">
        <header class="blog-articleHeader">
          <h1>${escapeHtml(post.title)}</h1>
          <div class="blog-meta">
            ${date}
            <span>${post.readingMinutes} min read</span>
          </div>
          ${summary}
        </header>
        <div class="t-markdown t-markdown--blog">
          <div class="t-markdownBody">${body}</div>
        </div>
      </article>
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
      title: "Blog | FS.dev",
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
        title: `${post.title} | FS.dev`,
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
