import { type CSSProperties, useEffect } from "react";
import { useReducedMotion } from "motion/react";
import type { LandingSectionProps } from "./types";

type HeroSectionProps = LandingSectionProps & {
  animateTitle: boolean;
  trustlineState: HeroTrustlineState;
  onTrustlineComplete: () => void;
};

export type HeroTrustlineState = "idle" | "typing" | "complete";

const trustline =
  "Products stall when nobody owns technical decisions, delivery, and long-term reliability.";
const trustlineWords = trustline.split(" ");
const trustlineWordEntranceMs = 760;
const trustlineCompletionBufferMs = 140;

function getTrustlineWordDelayMs(index: number) {
  const phrasePauseMs = Math.floor(index / 5) * 130;
  const waveOffsetMs = Math.sin(index * 1.18) * 38;

  return Math.max(
    0,
    Math.round(80 + index * 118 + phrasePauseMs + waveOffsetMs),
  );
}

const trustlineAnimationTotalMs =
  getTrustlineWordDelayMs(trustlineWords.length - 1) +
  trustlineWordEntranceMs +
  trustlineCompletionBufferMs;

export function HeroSection({
  animateTitle,
  hidden,
  trustlineState,
  onTrustlineComplete,
}: HeroSectionProps) {
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (trustlineState !== "typing") return;

    if (shouldReduceMotion) {
      onTrustlineComplete();
      return;
    }

    const completionTimerId = window.setTimeout(
      onTrustlineComplete,
      trustlineAnimationTotalMs,
    );

    return () => window.clearTimeout(completionTimerId);
  }, [onTrustlineComplete, shouldReduceMotion, trustlineState]);

  return (
    <section
      id="hero"
      className="landing-slide landing-hero"
      aria-labelledby="landing-title"
      hidden={hidden}
    >
      <div className="landing-heroCenter">
        <div className="landing-heroCopy">
          <h1
            id="landing-title"
            className={
              animateTitle
                ? "landing-title landing-title--intro"
                : "landing-title"
            }
          >
            <span>You don&apos;t need another developer.</span>
            <span>You need someone who owns execution.</span>
          </h1>
          <p className="landing-heroTrustline" data-state={trustlineState}>
            {trustlineState !== "idle" ? (
              <span className="landing-trustlineVisual" aria-hidden="true">
                {trustlineWords.map((word, index) => (
                  <span
                    className="landing-trustlineWord"
                    key={`${word}-${index}`}
                    style={
                      {
                        "--landing-trustline-word-delay": `${getTrustlineWordDelayMs(
                          index,
                        )}ms`,
                      } as CSSProperties
                    }
                  >
                    {word}
                  </span>
                ))}
              </span>
            ) : null}
            {trustlineState !== "idle" ? (
              <span className="landing-srOnly">{trustline}</span>
            ) : null}
          </p>
        </div>
      </div>
    </section>
  );
}
