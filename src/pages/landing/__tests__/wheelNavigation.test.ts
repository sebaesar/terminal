import { describe, expect, it } from "vitest";
import {
  getWheelNavigationIntent,
  isVerticalWheelNavigation,
} from "../wheelNavigation";

describe("getWheelNavigationIntent", () => {
  it("identifies vertical wheel movement before attempting cancellation", () => {
    expect(isVerticalWheelNavigation(8, 80)).toBe(true);
    expect(isVerticalWheelNavigation(80, 8)).toBe(false);
  });

  it("does not intercept mostly horizontal wheel movement", () => {
    expect(
      getWheelNavigationIntent({
        accumulatedDelta: 20,
        deltaX: 80,
        deltaY: 30,
        threshold: 60,
      }),
    ).toEqual({
      direction: null,
      shouldIntercept: false,
      nextAccumulatedDelta: 20,
    });
  });

  it("intercepts vertical wheel movement while accumulating below threshold", () => {
    expect(
      getWheelNavigationIntent({
        accumulatedDelta: 20,
        deltaX: 2,
        deltaY: 24,
        threshold: 60,
      }),
    ).toEqual({
      direction: null,
      shouldIntercept: true,
      nextAccumulatedDelta: 44,
    });
  });

  it("moves forward and resets accumulation after crossing the threshold", () => {
    expect(
      getWheelNavigationIntent({
        accumulatedDelta: 30,
        deltaX: 0,
        deltaY: 40,
        threshold: 60,
      }),
    ).toEqual({
      direction: 1,
      shouldIntercept: true,
      nextAccumulatedDelta: 0,
    });
  });

  it("moves backward and resets accumulation after crossing the threshold", () => {
    expect(
      getWheelNavigationIntent({
        accumulatedDelta: -30,
        deltaX: 0,
        deltaY: -40,
        threshold: 60,
      }),
    ).toEqual({
      direction: -1,
      shouldIntercept: true,
      nextAccumulatedDelta: 0,
    });
  });
});
