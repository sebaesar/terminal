import { describe, expect, it } from "vitest";
import { renderMarkdown } from "../MarkdownBlock";

describe("renderMarkdown", () => {
  it("keeps soft line breaks as article flow instead of forced breaks", async () => {
    const html = await renderMarkdown("First sentence.\nSecond sentence.");

    expect(html).not.toContain("<br");
    expect(html).toContain("First sentence.\nSecond sentence.");
  });
});
