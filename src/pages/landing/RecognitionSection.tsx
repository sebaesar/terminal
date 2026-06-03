import { useCallback, useEffect, useRef, useState } from "react";
import { recognitionItems } from "./content";
import type { LandingSectionProps } from "./types";

export type RecognitionEntranceMode = "default" | "accelerated";

type RecognitionSectionProps = LandingSectionProps & {
  entranceMode: RecognitionEntranceMode;
  onEntranceComplete: () => void;
};

const recognitionEntranceInitialDelayMs = 10;
const recognitionEntranceDefaultStepMs = 700;
const recognitionEntranceAcceleratedStepMs = 120;

function getRecognitionEntranceDelay(
  itemIndex: number,
  startIndex: number,
  entranceMode: RecognitionEntranceMode,
) {
  if (entranceMode === "accelerated") {
    return (itemIndex - startIndex) * recognitionEntranceAcceleratedStepMs;
  }

  return (
    recognitionEntranceInitialDelayMs +
    itemIndex * recognitionEntranceDefaultStepMs
  );
}

export function RecognitionSection({
  entranceMode,
  hidden,
  onEntranceComplete,
}: RecognitionSectionProps) {
  const [visibleCount, setVisibleCount] = useState(0);
  const visibleCountRef = useRef(0);
  const entranceTimerIdsRef = useRef<number[]>([]);

  const clearEntranceTimers = useCallback(() => {
    entranceTimerIdsRef.current.forEach((timerId) => {
      window.clearTimeout(timerId);
    });
    entranceTimerIdsRef.current = [];
  }, []);

  useEffect(() => {
    visibleCountRef.current = visibleCount;
  }, [visibleCount]);

  useEffect(() => {
    if (hidden) return;

    clearEntranceTimers();

    const startIndex =
      entranceMode === "accelerated" ? visibleCountRef.current : 0;

    for (
      let itemIndex = startIndex;
      itemIndex < recognitionItems.length;
      itemIndex += 1
    ) {
      const timerId = window.setTimeout(() => {
        setVisibleCount((currentCount) =>
          Math.max(currentCount, itemIndex + 1),
        );
      }, getRecognitionEntranceDelay(itemIndex, startIndex, entranceMode));

      entranceTimerIdsRef.current.push(timerId);
    }

    return clearEntranceTimers;
  }, [clearEntranceTimers, entranceMode, hidden]);

  useEffect(() => {
    if (visibleCount < recognitionItems.length) return;
    onEntranceComplete();
  }, [onEntranceComplete, visibleCount]);

  return (
    <section
      id="recognition"
      className="landing-slide landing-section landing-recognition"
      aria-labelledby="recognition-title"
      hidden={hidden}
    >
      <div className="landing-sectionInner">
        <p className="landing-kicker">Recognition</p>
        <h2 id="recognition-title">Founders often arrive here after:</h2>
        <ul className="landing-recognitionList">
          {recognitionItems.map((item, index) => (
            <li
              data-visible={index < visibleCount ? "true" : "false"}
              key={item}
            >
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
