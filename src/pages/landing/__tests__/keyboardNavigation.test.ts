import { describe, expect, it } from "vitest";
import {
  getKeyboardNavigationDirection,
  shouldIgnoreLandingKeyboardNavigation,
} from "../keyboardNavigation";

function keyboardEvent(overrides: Partial<KeyboardEvent> = {}) {
  return {
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    isComposing: false,
    repeat: false,
    target: null,
    ...overrides,
  } as KeyboardEvent;
}

describe("getKeyboardNavigationDirection", () => {
  it("moves to the next section for ArrowDown", () => {
    expect(getKeyboardNavigationDirection("ArrowDown")).toBe(1);
  });

  it("moves to the previous section for ArrowUp", () => {
    expect(getKeyboardNavigationDirection("ArrowUp")).toBe(-1);
  });

  it("ignores unrelated keys", () => {
    expect(getKeyboardNavigationDirection("PageDown")).toBeNull();
  });
});

describe("shouldIgnoreLandingKeyboardNavigation", () => {
  it("allows a plain keyboard navigation event", () => {
    expect(shouldIgnoreLandingKeyboardNavigation(keyboardEvent())).toBe(false);
  });

  it("ignores repeated keydown events", () => {
    expect(
      shouldIgnoreLandingKeyboardNavigation(keyboardEvent({ repeat: true })),
    ).toBe(true);
  });

  it("ignores modified keydown events", () => {
    expect(
      shouldIgnoreLandingKeyboardNavigation(keyboardEvent({ metaKey: true })),
    ).toBe(true);
  });
});
