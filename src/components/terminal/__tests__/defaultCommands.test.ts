import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TerminalLine, TerminalLineInput } from "@types";
import { CommandRegistry } from "../commandRegistry";
import {
  DEFAULT_SUGGESTED_COMMANDS,
  formatCommandToButton,
  registerDefaultCommands,
} from "../defaultCommands";
import { TerminalModel } from "../terminalModel";
import { findFileByName } from "../../../data/files";
import type { TerminalProps } from "@types";
import { blogIndex } from "../../../data/blogIndex";
import { searchStore } from "../../../stores/searchStore";

const noop = () => {};
const indexedBlogs = blogIndex.getAll();

function normalizeOutput(output: unknown): unknown[] {
  return Array.isArray(output) ? output : [output];
}

function findSegment<T extends { type: string }>(
  lines: unknown[],
  type: T["type"],
): T | undefined {
  return lines
    .flatMap((line) => (Array.isArray(line) ? line : []))
    .find((seg): seg is T => {
      return (
        typeof seg === "object" &&
        seg !== null &&
        "type" in seg &&
        (seg as T).type === type
      );
    });
}

function firstSearchableBlogTerm(): { slug: string; query: string } {
  const post = indexedBlogs.find((entry) =>
    [entry.title, entry.summary, ...entry.plainLines]
      .filter((line): line is string => Boolean(line))
      .some((line) => /\b[a-z0-9]{4,}\b/i.test(line)),
  );
  if (!post) throw new Error("expected at least one searchable blog post");

  const text = [post.title, post.summary, ...post.plainLines]
    .filter((line): line is string => Boolean(line))
    .join(" ");
  const query = text.match(/\b[a-z0-9]{4,}\b/i)?.[0];
  if (!query) throw new Error(`expected searchable text for blog ${post.slug}`);

  return { slug: post.slug, query };
}

function buildRegistry(props: TerminalProps = {}) {
  const registry = new CommandRegistry();
  const model = new TerminalModel({ prompt: ">" });
  registerDefaultCommands({
    registry,
    props,
    model,
    setLinesFromModel: noop,
  });
  return { registry, model };
}

describe("default commands", () => {
  beforeEach(() => {
    // Make sure fetch exists for command handlers.
    globalThis.fetch = vi.fn(async () => new Response("sample text line\nkickoff line"));
    searchStore.clear();
    searchStore.close();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lists files from the manifest via ls", async () => {
    const { registry, model } = buildRegistry();
    const lsHandler = registry.get("ls")?.handler;
    expect(lsHandler).toBeTruthy();
    const output = await lsHandler?.({ args: [], raw: "ls", model, registry });
    const lines = Array.isArray(output) ? output : [output];

    const fileRows = lines.filter((line): line is TerminalLine =>
      Array.isArray(line),
    );
    const textRows = fileRows
      .flatMap((line) => line)
      .filter((segment): segment is { type: "text"; text: string } => {
        return typeof segment !== "string" && segment.type === "text";
      })
      .map((segment) => segment.text)
      .join("\n");

    const downloadCommands = fileRows
      .flatMap((line) => line)
      .filter((segment): segment is { type: "command"; command: string; label: string } => {
        return typeof segment !== "string" && segment.type === "command";
      });

    expect(textRows).toContain("llm.txt");
    expect(textRows).toContain("miladtsx_software_engineer_resume.pdf");
    expect(
      downloadCommands.some((segment) => segment.command === "download llm.txt"),
    ).toBe(true);
    expect(
      downloadCommands.some(
        (segment) =>
          segment.command === "download miladtsx_software_engineer_resume.pdf",
      ),
    ).toBe(true);
    expect(downloadCommands.every((segment) => segment.label === "⬇")).toBe(true);
  });

  it("verify reports hash match for empty file", async () => {
    const { registry, model } = buildRegistry();
    const verifyHandler = registry.get("verify")?.handler;
    expect(verifyHandler).toBeTruthy();

    // align manifest entry with mocked empty content so the hash matches
    const llm = findFileByName("llm.txt");
    if (llm) {
      llm.sha256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
      llm.size = 0;
    }

    const fetchMock = vi.fn(async () => new Response(new Uint8Array([])));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const output = await verifyHandler?.({
      args: ["llm.txt"],
      raw: "verify llm.txt",
      model,
      registry,
    });
    const lines = Array.isArray(output) ? output : [output];
    expect(lines.join("\n")).toContain("hash match");
    expect(fetchMock).toHaveBeenCalled();
  });

  it("verify reports mismatch when digest differs", async () => {
    const { registry, model } = buildRegistry();
    const verifyHandler = registry.get("verify")?.handler;

    const fetchMock = vi.fn(
      async () => new Response(new TextEncoder().encode("not-empty"))
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const output = await verifyHandler?.({
      args: ["miladtsx_software_engineer_resume.pdf"],
      raw: "verify miladtsx_software_engineer_resume.pdf",
      model,
      registry,
    });
    const lines = Array.isArray(output) ? output : [output];
    expect(lines.join("\n")).toContain("hash mismatch");
  });

  it("cat declines to print binary files", async () => {
    const { registry, model } = buildRegistry();
    const catHandler = registry.get("cat")?.handler;
    const output = await catHandler?.({
      args: ["miladtsx_software_engineer_resume.pdf"],
      raw: "cat miladtsx_software_engineer_resume.pdf",
      model,
      registry,
    });
    const lines = Array.isArray(output) ? output : [output];
    expect(lines.join("\n")).toContain("binary");
  });

  it("lists blogs in the accordion view and supports reading", async () => {
    const { registry, model } = buildRegistry();
    const blogHandler = registry.get("blog")?.handler;
    expect(blogHandler).toBeTruthy();

    const listOut = await blogHandler?.({
      args: ["list"],
      raw: "blog list",
      model,
      registry,
    });
    const listLines = normalizeOutput(listOut);
    const logSeg = findSegment<{
      type: "logs";
      items: Array<{
        slug?: string;
        note: string;
        readingMinutes?: number;
        readingTimeLabel?: string;
        body?: string;
        markdownVariant?: string;
      }>;
    }>(listLines, "logs");
    expect(logSeg).toBeTruthy();
    expect(logSeg?.items).toHaveLength(indexedBlogs.length);
    expect(logSeg?.items.map((item) => item.slug).sort()).toEqual(
      indexedBlogs.map((post) => post.slug).sort(),
    );
    expect(logSeg?.items.every((item) => item.note && item.body)).toBe(true);
    expect(
      logSeg?.items.every((item) => /^\d+ min read$/.test(item.readingTimeLabel || "")),
    ).toBe(true);
    expect(logSeg?.items.every((item) => (item.readingMinutes || 0) >= 1)).toBe(true);
    expect(logSeg?.items.every((item) => item.markdownVariant === "blog")).toBe(true);

    const post =
      indexedBlogs.find((entry) => entry.slug === "premature-scaling") ??
      indexedBlogs[0];
    const readOut = await blogHandler?.({
      args: ["read", post.slug],
      raw: `blog read ${post.slug}`,
      model,
      registry,
    });
    const readLines = normalizeOutput(readOut);
    const markdownSeg = findSegment<{
      type: "markdown";
      title?: string;
      markdown: string;
      date?: string;
    }>(readLines, "markdown");
    expect(markdownSeg).toMatchObject({
      title: post.title,
      markdown: [post.summary, post.body].filter(Boolean).join("\n\n"),
      date: post.date,
    });
  });

  it("searches consolidated blogs and includes them in grep", async () => {
    const { registry, model } = buildRegistry();
    const blogHandler = registry.get("blog")?.handler;
    const grepHandler = registry.get("grep")?.handler;
    const { slug, query } = firstSearchableBlogTerm();

    const searchOut = await blogHandler?.({
      args: ["search", query],
      raw: `blog search ${query}`,
      model,
      registry,
    });
    const searchLines = normalizeOutput(searchOut);
    expect(searchLines.join("\n")).toContain(slug);

    const grepOut = await grepHandler?.({
      args: [query],
      raw: `grep ${query}`,
      model,
      registry,
    });
    const grepLines = normalizeOutput(grepOut);
    const grepSummary = grepLines.join("\n");
    expect(grepSummary).toContain("search modal open");
    expect(grepSummary).toContain(query);
    expect(
      searchStore
        .getState()
        .hits.some(
          (hit) => hit.source === "blog" && hit.readCommand === `blog read ${slug}`,
        ),
    ).toBe(true);
  });

  it("includes work case studies in grep results", async () => {
    const { registry, model } = buildRegistry();
    const grepHandler = registry.get("grep")?.handler;

    const grepOut = await grepHandler?.({
      args: ["outsourcing"],
      raw: "grep outsourcing",
      model,
      registry,
    });
    const grepLines = Array.isArray(grepOut) ? grepOut : [grepOut];
    const summary = grepLines.join("\n");
    expect(summary).toContain("search modal open");
    expect(summary.toLowerCase()).toContain("outsourcing");
  });

  it("uses selected_cases as the case study command", async () => {
    const { registry, model } = buildRegistry();
    expect(registry.get("work")).toBeUndefined();

    const selectedCasesHandler = registry.get("selected_cases")?.handler;
    expect(selectedCasesHandler).toBeTruthy();

    const listOut = await selectedCasesHandler?.({
      args: [],
      raw: "selected_cases",
      model,
      registry,
    });
    expect(JSON.stringify(listOut)).toContain("Release Gates for Live Funds");
    const listLines = Array.isArray(listOut) ? listOut : [listOut];
    const workLine = listLines.find(
      (line): line is TerminalLine => Array.isArray(line),
    );
    const workSegment = workLine?.find(
      (segment): segment is Extract<TerminalLine[number], { type: "work" }> =>
        segment.type === "work",
    );
    expect(workSegment?.clientProof?.title).toBe("Experiences");
    expect(workSegment?.clientProof?.items).toHaveLength(8);

    const readOut = await selectedCasesHandler?.({
      args: ["read", "security-triage-automation"],
      raw: "selected_cases read security-triage-automation",
      model,
      registry,
    });
    expect(JSON.stringify(readOut)).toContain("Security Triage Automation");
  });

  it("uses only blog as the markdown command", async () => {
    const { registry, model } = buildRegistry();
    expect(registry.get("blogs")).toBeUndefined();
    expect(registry.get("logs")).toBeUndefined();
    expect(registry.getCanonicalName("blogs")).toBeUndefined();
    expect(registry.getCanonicalName("logs")).toBeUndefined();

    const blogHandler = registry.get("blog")?.handler;
    expect(blogHandler).toBeTruthy();

    const listOut = await blogHandler?.({
      args: ["list"],
      raw: "blog list",
      model,
      registry,
    });
    const listLines = normalizeOutput(listOut);
    const logsSegment = findSegment<{
      type: "logs";
      items: Array<{ slug?: string }>;
    }>(listLines, "logs");
    expect(logsSegment?.items).toHaveLength(indexedBlogs.length);

    const post =
      indexedBlogs.find((entry) => entry.slug === "automation-risk") ??
      indexedBlogs[0];
    const readOut = await blogHandler?.({
      args: ["read", post.slug],
      raw: `blog read ${post.slug}`,
      model,
      registry,
    });
    const readLines = normalizeOutput(readOut);
    const logSeg = findSegment<{ type: "logs"; items: Array<{ slug?: string; body?: string }> }>(
      readLines,
      "logs",
    );
    expect(logSeg?.items).toHaveLength(1);
    expect(logSeg?.items[0]).toMatchObject({
      slug: post.slug,
      body: [post.summary, post.body].filter(Boolean).join("\n\n"),
    });
  });

  it("prints and clears command history", async () => {
    const { registry, model } = buildRegistry();
    model.setHistory(["first", "second"]);
    const historyHandler = registry.get("history")?.handler;
    const listOutput = await historyHandler?.({
      args: [],
      raw: "history",
      model,
      registry,
    });
    const listLines = Array.isArray(listOutput) ? listOutput : [listOutput];
    expect(listLines.join("\n")).toContain("1  first");
    expect(listLines.join("\n")).toContain("2  second");

    const clearOutput = await historyHandler?.({
      args: ["-c"],
      raw: "history -c",
      model,
      registry,
    });
    const clearLines = Array.isArray(clearOutput) ? clearOutput : [clearOutput];
    expect(clearLines.join("\n")).toContain("cleared");
    expect(model.getHistory()).toEqual([]);
  });

  it("marks suggested command buttons to use simulated typing", () => {
    const lines = formatCommandToButton("> ", DEFAULT_SUGGESTED_COMMANDS)();
    const buttonLine = lines[1];
    expect(Array.isArray(buttonLine)).toBe(true);

    const buttons = (buttonLine as TerminalLine).filter(
      (segment): segment is Extract<TerminalLine[number], { type: "command" }> =>
        typeof segment !== "string" && segment.type === "command",
    );

    expect(buttons.length).toBe(DEFAULT_SUGGESTED_COMMANDS.length);
    expect(buttons.every((segment) => segment.typing === "simulate")).toBe(true);
  });

  it("structures the about command into header and bio sections", async () => {
    const aboutLines = [
      "Systems should behave predictably-even when assumptions break.".replace(
        "-",
        "—",
      ),
      "By day: building them.",
      "By night: breaking them—turning failures into controlled outcomes.",
    ];
    const { registry, model } = buildRegistry({ aboutLines });
    const aboutHandler = registry.get("about")?.handler;
    expect(aboutHandler).toBeTruthy();

    const output = await aboutHandler?.({
      args: [],
      raw: "about",
      model,
      registry,
    });
    const lines = Array.isArray(output) ? output : [output];
    const avatarLine = lines.find(
      (line): line is TerminalLine =>
        Array.isArray(line) && line.some((segment) => (segment as any).type === "avatar"),
    );
    expect(avatarLine).toBeTruthy();

    const avatarSegment = avatarLine?.find(
      (segment): segment is Extract<TerminalLine[number], { type: "avatar" }> =>
        typeof segment !== "string" && segment.type === "avatar",
    );
    expect(avatarSegment).toMatchObject({
      lines: [
        "Milad",
        "Software Engineering - Control & Reliability",
      ],
      emphasizeLines: [1],
    });
    expect(avatarSegment?.bodyLines).toEqual(aboutLines);
  });
});
