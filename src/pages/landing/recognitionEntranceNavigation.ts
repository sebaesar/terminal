import type { LandingSectionId } from "./types";
import type { WorkNavigationDirection } from "./workNavigation";

type RecognitionEntranceNavigationState = {
  activeSection: LandingSectionId;
  direction: WorkNavigationDirection;
  isEntranceComplete: boolean;
  shouldReduceMotion: boolean;
};

export function shouldAdvanceRecognitionEntrance({
  activeSection,
  direction,
  isEntranceComplete,
  shouldReduceMotion,
}: RecognitionEntranceNavigationState) {
  return (
    activeSection === "recognition" &&
    direction > 0 &&
    !isEntranceComplete &&
    !shouldReduceMotion
  );
}
