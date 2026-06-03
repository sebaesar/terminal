#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, "dist");
const BASE_PATH = process.env.BASE_PATH || "/terminal/";
const DEFAULT_HOST = "https://failuresmith.github.io";

function normalizeBasePath(value) {
  if (!value || value === "/") return "/";
  return `/${value.replace(/^\/+|\/+$/g, "")}/`;
}

function inferSiteUrl() {
  if (process.env.SITE_URL) return process.env.SITE_URL;
  if (process.env.VITE_SITE_URL) return process.env.VITE_SITE_URL;

  const repository = process.env.GITHUB_REPOSITORY;
  if (repository && repository.includes("/")) {
    const [owner, repo] = repository.split("/");
    return `https://${owner}.github.io/${repo}/`;
  }

  return `${DEFAULT_HOST}${normalizeBasePath(BASE_PATH)}`;
}

function normalizeSiteUrl(value) {
  const url = new URL(value);
  url.hash = "";
  url.search = "";
  url.pathname = `${url.pathname.replace(/\/+$/g, "")}/`;
  return url;
}

function escapeXml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function findHtmlFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await findHtmlFiles(entryPath));
    } else if (entry.isFile() && entry.name === "index.html") {
      files.push(entryPath);
    }
  }

  return files;
}

function routeFromHtmlFile(filePath) {
  const relative = path.relative(DIST_DIR, filePath).split(path.sep).join("/");
  const route = relative.replace(/(?:^|\/)index\.html$/, "");
  return route ? `${route}/` : "";
}

function sitemapXml(urls) {
  const entries = urls
    .map((url) => `  <url>\n    <loc>${escapeXml(url)}</loc>\n  </url>`)
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    entries,
    "</urlset>",
    "",
  ].join("\n");
}

async function main() {
  const siteUrl = normalizeSiteUrl(inferSiteUrl());
  const htmlFiles = await findHtmlFiles(DIST_DIR);
  const routes = htmlFiles.map(routeFromHtmlFile).sort((a, b) => a.localeCompare(b));
  const urls = routes.map((route) => new URL(route, siteUrl).toString());
  const sitemapUrl = new URL("sitemap.xml", siteUrl).toString();

  await fs.writeFile(
    path.join(DIST_DIR, "robots.txt"),
    ["User-agent: *", "Allow: /", `Sitemap: ${sitemapUrl}`, ""].join("\n"),
  );
  await fs.writeFile(path.join(DIST_DIR, "sitemap.xml"), sitemapXml(urls));

  console.log(`generated robots.txt and sitemap.xml for ${urls.length} routes`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
