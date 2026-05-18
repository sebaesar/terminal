import { describe, expect, it } from "vitest";
import { parseShareCommandsFromLocation } from "../shareLink";

function locationWithSearch(search: string): Location {
  return { search } as Location;
}

describe("share links", () => {
  it("accepts double-encoded consolidated blog read commands", () => {
    const commands = parseShareCommandsFromLocation(
      locationWithSearch("?run=blogs%2520read%25202025-01-21-tab"),
    );

    expect(commands).toEqual(["blogs read 2025-01-21-tab"]);
  });
});
