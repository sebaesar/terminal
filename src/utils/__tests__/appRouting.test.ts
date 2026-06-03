import { describe, expect, it } from "vitest";
import {
  getClientRoutePath,
  parseAppRoute,
  withBasePath,
} from "../appRouting";

const base = "/terminal/";
const current = {
  origin: "https://failuresmith.dev",
  pathname: "/terminal/blog/",
  search: "",
  hash: "",
};

describe("app routing", () => {
  it("parses blog routes under the configured base path", () => {
    expect(parseAppRoute("/terminal/blog/automation-risk/", base)).toEqual({
      name: "blog",
      slug: "automation-risk",
    });
  });

  it("builds canonical app paths with the configured base path", () => {
    expect(withBasePath("/blog/automation-risk/", base)).toBe(
      "/terminal/blog/automation-risk/",
    );
  });

  it("allows same-origin app routes to be handled by React", () => {
    expect(
      getClientRoutePath(
        "https://failuresmith.dev/terminal/blog/automation-risk/",
        current,
        base,
      ),
    ).toBe("/terminal/blog/automation-risk/");
  });

  it("normalizes the blog index to the prerendered slash route", () => {
    expect(
      getClientRoutePath("https://failuresmith.dev/terminal/blog", current, base),
    ).toBe("/terminal/blog/");
  });

  it("keeps external and out-of-app links as document navigations", () => {
    expect(
      getClientRoutePath(
        "https://example.com/terminal/blog/automation-risk/",
        current,
        base,
      ),
    ).toBeNull();
    expect(
      getClientRoutePath("https://failuresmith.dev/other/blog/", current, base),
    ).toBeNull();
  });
});
