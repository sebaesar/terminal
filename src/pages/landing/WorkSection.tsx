import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { caseStudies } from "./content";
import type { LandingSectionProps } from "./types";
import {
  getCaseTransitionXOffset,
  type CaseTransitionPhase,
  type WorkNavigationDirection,
} from "./workNavigation";

type WorkSectionProps = LandingSectionProps & {
  activeCaseStudyIndex: number;
  caseTransitionDirection: WorkNavigationDirection;
};

type CaseTransitionContext = {
  direction: WorkNavigationDirection;
  shouldReduceMotion: boolean;
};

const caseTransitionDistancePx = 32;
const caseTransitionVariants = {
  enter: (context: CaseTransitionContext) =>
    getCaseTransitionFrame("enter", context),
  active: { opacity: 1, x: 0 },
  exit: (context: CaseTransitionContext) =>
    getCaseTransitionFrame("exit", context),
};

function getCaseTransitionFrame(
  phase: CaseTransitionPhase,
  { direction, shouldReduceMotion }: CaseTransitionContext,
) {
  return {
    opacity: 0,
    x: shouldReduceMotion
      ? 0
      : getCaseTransitionXOffset(
          direction,
          phase,
          caseTransitionDistancePx,
        ),
  };
}

function ArrowTitle({ before, after }: { before: string; after: string }) {
  return (
    <span className="landing-caseTitleText">
      <span>{before}</span>
      <span aria-hidden="true">{"\u2192"}</span>
      <span>{after}</span>
    </span>
  );
}

export function WorkSection({
  activeCaseStudyIndex,
  caseTransitionDirection,
  hidden,
}: WorkSectionProps) {
  const shouldReduceMotion = useReducedMotion();
  const caseTransitionContext = {
    direction: caseTransitionDirection,
    shouldReduceMotion: Boolean(shouldReduceMotion),
  };
  const activeCaseStudy = caseStudies[activeCaseStudyIndex] ?? caseStudies[0];
  const activeProgressIndex = activeCaseStudy
    ? caseStudies.indexOf(activeCaseStudy)
    : -1;
  const activeProgressLabel =
    activeProgressIndex >= 0
      ? `Case study ${activeProgressIndex + 1} of ${caseStudies.length}`
      : "No case studies available";

  return (
    <section
      id="work"
      className="landing-slide landing-section landing-work"
      aria-labelledby="work-title"
      hidden={hidden}
    >
      <div className="landing-sectionInner">
        <header className="landing-sectionHeader">
          <p className="landing-kicker">Selected work</p>
          <h2 id="work-title">
            Methodical ownership changed the outcome.
          </h2>
        </header>

        <div className="landing-caseList" aria-live="polite">
          {caseStudies.length > 0 ? (
            <div className="landing-caseProgress">
              <span className="landing-srOnly">{activeProgressLabel}</span>
              <div className="landing-caseProgressTrack" aria-hidden="true">
                {caseStudies.map((caseStudy, index) => (
                  <span
                    className="landing-caseProgressDot"
                    data-active={
                      index === activeProgressIndex ? "true" : undefined
                    }
                    key={`${caseStudy.before}-${caseStudy.after}`}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {activeCaseStudy ? (
            <AnimatePresence
              custom={caseTransitionContext}
              initial={false}
              mode="wait"
            >
              <motion.article
                className="landing-caseStudy"
                custom={caseTransitionContext}
                key={`${activeCaseStudy.before}-${activeCaseStudy.after}`}
                variants={caseTransitionVariants}
                initial="enter"
                animate="active"
                exit="exit"
                transition={{
                  duration: shouldReduceMotion ? 0.08 : 0.2,
                  ease: shouldReduceMotion ? "linear" : [0.22, 1, 0.36, 1],
                }}
              >
                <h3>
                  <ArrowTitle
                    before={activeCaseStudy.before}
                    after={activeCaseStudy.after}
                  />
                </h3>
                <div className="landing-caseBody">
                  <p>{activeCaseStudy.situation}</p>
                  <p>{activeCaseStudy.outcome}</p>
                </div>
              </motion.article>
            </AnimatePresence>
          ) : null}
        </div>
      </div>
    </section>
  );
}
