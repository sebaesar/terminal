import { describe, expect, it } from "vitest";
import { getDragNavigationDirection } from "../dragNavigation";
import { getKeyboardNavigationDirection } from "../keyboardNavigation";
import { shouldAdvanceRecognitionEntrance } from "../recognitionEntranceNavigation";

const incompleteRecognitionState = {
  activeSection: "recognition",
  isEntranceComplete: false,
  shouldReduceMotion: false,
} as const;

describe("shouldAdvanceRecognitionEntrance", () => {
  it("intercepts forward keyboard navigation during the entrance", () => {
    const direction = getKeyboardNavigationDirection("ArrowDown");

    expect(direction).toBe(1);
    expect(
      shouldAdvanceRecognitionEntrance({
        ...incompleteRecognitionState,
        direction: direction ?? 1,
      }),
    ).toBe(true);
  });

  it("allows backward keyboard navigation during the entrance", () => {
    const direction = getKeyboardNavigationDirection("ArrowUp");

    expect(direction).toBe(-1);
    expect(
      shouldAdvanceRecognitionEntrance({
        ...incompleteRecognitionState,
        direction: direction ?? -1,
      }),
    ).toBe(false);
  });

  it("intercepts forward wheel navigation during the entrance", () => {
    expect(
      shouldAdvanceRecognitionEntrance({
        ...incompleteRecognitionState,
        direction: 1,
      }),
    ).toBe(true);
  });

  it("allows backward wheel navigation during the entrance", () => {
    expect(
      shouldAdvanceRecognitionEntrance({
        ...incompleteRecognitionState,
        direction: -1,
      }),
    ).toBe(false);
  });

  it("intercepts forward drag navigation during the entrance", () => {
    const direction = getDragNavigationDirection(4, -80);

    expect(direction).toBe(1);
    expect(
      shouldAdvanceRecognitionEntrance({
        ...incompleteRecognitionState,
        direction: direction ?? 1,
      }),
    ).toBe(true);
  });

  it("allows backward drag navigation during the entrance", () => {
    const direction = getDragNavigationDirection(4, 80);

    expect(direction).toBe(-1);
    expect(
      shouldAdvanceRecognitionEntrance({
        ...incompleteRecognitionState,
        direction: direction ?? -1,
      }),
    ).toBe(false);
  });

  it("does not intercept when the entrance is complete or motion is reduced", () => {
    expect(
      shouldAdvanceRecognitionEntrance({
        ...incompleteRecognitionState,
        direction: 1,
        isEntranceComplete: true,
      }),
    ).toBe(false);
    expect(
      shouldAdvanceRecognitionEntrance({
        ...incompleteRecognitionState,
        direction: 1,
        shouldReduceMotion: true,
      }),
    ).toBe(false);
  });

  it("does not intercept outside the recognition section", () => {
    expect(
      shouldAdvanceRecognitionEntrance({
        ...incompleteRecognitionState,
        activeSection: "hero",
        direction: 1,
      }),
    ).toBe(false);
  });
});
