import type { WorkNavigationDirection } from "./workNavigation";

type WheelNavigationState = {
  accumulatedDelta: number;
  deltaX: number;
  deltaY: number;
  threshold: number;
};

type IgnoredWheelNavigation = {
  direction: null;
  shouldIntercept: false;
  nextAccumulatedDelta: number;
};

type PendingWheelNavigation = {
  direction: null;
  shouldIntercept: true;
  nextAccumulatedDelta: number;
};

type ReadyWheelNavigation = {
  direction: WorkNavigationDirection;
  shouldIntercept: true;
  nextAccumulatedDelta: 0;
};

export type WheelNavigationIntent =
  | IgnoredWheelNavigation
  | PendingWheelNavigation
  | ReadyWheelNavigation;

export function isVerticalWheelNavigation(deltaX: number, deltaY: number) {
  return Math.abs(deltaY) >= Math.abs(deltaX);
}

export function getWheelNavigationIntent({
  accumulatedDelta,
  deltaX,
  deltaY,
  threshold,
}: WheelNavigationState): WheelNavigationIntent {
  if (!isVerticalWheelNavigation(deltaX, deltaY)) {
    return {
      direction: null,
      shouldIntercept: false,
      nextAccumulatedDelta: accumulatedDelta,
    };
  }

  const nextAccumulatedDelta = accumulatedDelta + deltaY;
  if (Math.abs(nextAccumulatedDelta) < threshold) {
    return {
      direction: null,
      shouldIntercept: true,
      nextAccumulatedDelta,
    };
  }

  return {
    direction: nextAccumulatedDelta > 0 ? 1 : -1,
    shouldIntercept: true,
    nextAccumulatedDelta: 0,
  };
}
